/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  whatis,
  whatis_matches_t,
  add_match_set_func_t,
  whatis_plugin_t
} from '@opsimathically/whatis';

import { deepEqual } from 'fast-equals';
import { generateRandomGarbage } from '@opsimathically/garbage';
import {
  ObjectSearch,
  ObjectSearchUtils,
  path_t,
  path_elem_t,
  on_key_params_t,
  on_val_params_t,
  objsearch_whatis_extra_data_t
} from '@opsimathically/objectsearch';

import { deepClone } from '@opsimathically/deepclone';

import {
  randomIntegerBetween,
  randomNegativeIntegerBetween,
  randomBinaryBufferBetween,
  randomBinaryBuffer,
  randomTimeBetween,
  randomString,
  randomStringStringBetweenLength,
  randomHexString,
  randomAlphabetString,
  randomArrayOfAlphaStrings,
  randomAlphabetStringBetweenLength,
  randomAlphanumericString,
  randomAlphanumericStringBetweenLength,
  randomIPV4Address,
  randomArrayOfIPV4Addresses,
  randomizeValuesOfSummableArray,
  randomGuid,
  randomDoubleLengthGuid
} from '@opsimathically/randomdatatools';

import { FuzzString } from '@src/type_fuzzers/FuzzString.class';

// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// %%% Plugin Types %%%%%%%%%%%%%%%%%%%%%%%%%%%
// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

type applicable_plugin_target_t = {
  key: boolean;
  value: boolean;
};

type fuzzdata_plugin_info_t = {
  name: string;
  version: string;
  description: string;
  targets: {
    key?: boolean;
    value?: boolean;
  };
  extra?: unknown;
};

type fuzzdata_plugin_match_params_t = {
  data: any;
  whatis_data: whatis_matches_t;
  objsearch_info: on_key_params_t | on_val_params_t;
  plugin_set: any;
  parent_gen: FuzzDataGen;
};

type fuzzdata_plugin_gen_params_t = {
  data: any;
  whatis_data: whatis_matches_t;
  objsearch_info: on_key_params_t | on_val_params_t;
  plugin_set: any;
  parent_gen: FuzzDataGen;
};

type fuzzdata_plugin_class_t = {
  plugin_info: fuzzdata_plugin_info_t;
  match(params: fuzzdata_plugin_match_params_t): Promise<boolean>;
  gen(params: fuzzdata_plugin_gen_params_t): Promise<gendata_t>;
};

// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// %%%
// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

/**
 * When a plugin generates data using it's gen() method, it
 * will return an object matching this type.  This is used
 * to track what data was generated, how, and from where.
 */
type gendata_t = {
  plugin_info: fuzzdata_plugin_info_t;
  data: {
    new: unknown;
    old: unknown;
  };
  whatis_data: whatis_matches_t;
  objsearch_info: on_key_params_t | on_val_params_t;
  extra?: unknown;
};

type fuzzdata_t = {
  changeset: gendata_t[];
  data: any;
};

// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// %%%
// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

type fuzz_template_t = {
  config?: {
    fuzz?: {
      strings?: {
        enabled?: boolean;
        injections?: {
          min_len?: number;
          max_len?: number;
        };
      };
    };
  };
  strings?: {
    matchgen: () => Promise<any>;
  };
};

class FuzzDataGen {
  // plugins fed to whatis() to determine custom types/metadata etc.
  whatis_plugins: whatis_plugin_t<objsearch_whatis_extra_data_t>[] = [];
  constructor(options?: {
    whatis_plugins?: whatis_plugin_t<objsearch_whatis_extra_data_t>[];
  }) {
    if (options?.whatis_plugins) this.whatis_plugins = options.whatis_plugins;
  }

  /**
   * Based on a percentage, activate plugins on things that match.
   */
  async gamble(params: {
    in_data: any;
    gamble_config: any;
  }): Promise<fuzzdata_t> {
    const fuzzdatagen_ref = this;

    // run initial whatis
    const whatis_data = whatis(params.in_data, fuzzdatagen_ref.whatis_plugins);

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // %%% Process Primitives %%%%%%%%%%%%%%%%%%
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

    // matching plugin set
    let matching_plugins: fuzzdata_plugin_class_t[] = [];

    let is_primitive = false;
    switch (true) {
      // check primitive types
      case whatis_data.types.string:
      case whatis_data.types.undefined:
      case whatis_data.types.number:
      case whatis_data.types.boolean:
      case whatis_data.types.bigint:
      case whatis_data.codes.null:
        is_primitive = true;
        {
          matching_plugins = await fuzzdatagen_ref.matchApplicablePlugins({
            data: params.in_data,
            whatis_data: whatis_data,
            objsearch_info: null as unknown as on_key_params_t,
            plugin_set: params.gamble_config.plugins
          });
        }
        break;

      default:
        break;
    }

    if (is_primitive) {
      if (matching_plugins.length > 0) {
        const plugin_index = randomIntegerBetween(
          0,
          matching_plugins.length - 1
        );
        if (plugin_index === null)
          throw new Error('FuzzDataGen could not generate a random integer.');
        if (Number.isInteger(plugin_index)) {
          // generate data
          const gendata: gendata_t = await matching_plugins[plugin_index].gen({
            data: params.in_data,
            whatis_data: whatis_data,
            objsearch_info: null as unknown as on_key_params_t,
            plugin_set: params.gamble_config.plugins,
            parent_gen: fuzzdatagen_ref
          });

          // create fuzzdata
          const fuzzdata: fuzzdata_t = {
            changeset: [gendata],
            data: gendata.data.new
          };

          // return the fuzzdata
          return fuzzdata;
        }
      }
    }

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // %%% Process Non-Primitives %%%%%%%%%%%%%%
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

    const cloned_in_data = deepClone(params.in_data);

    const objsearch_utils = new ObjectSearchUtils(cloned_in_data, {
      whatis_plugins: []
    });

    // create fuzzdata
    const fuzzdata: fuzzdata_t = {
      changeset: [],
      data: cloned_in_data
    };

    await objsearch_utils.search({
      key: async function (
        key: any,
        info: on_key_params_t,
        objsearch: ObjectSearch
      ) {
        /*
        let matching_plugins = await fuzzdatagen_ref.matchApplicablePlugins({
          data: params.in_data,
          whatis_data: info.whatis.key,
          objsearch_info: null as unknown as on_key_params_t,
          plugin_set: params.gamble_config.plugins
        });
        */
        // fuzzdata.changeset
        // debugger;
      },
      val: async function (
        val: any,
        info: on_key_params_t,
        objsearch: ObjectSearch
      ) {
        const matching_plugins = await fuzzdatagen_ref.matchApplicablePlugins({
          data: val,
          whatis_data: info.whatis.value,
          objsearch_info: info,
          plugin_set: params.gamble_config.plugins
        });
        if (matching_plugins.length > 0) {
          const plugin_index = randomIntegerBetween(
            0,
            matching_plugins.length - 1
          );
          if (plugin_index === null)
            throw new Error('FuzzDataGen could not generate a random integer.');
          if (Number.isInteger(plugin_index)) {
            // generate data
            const gendata: gendata_t = await matching_plugins[plugin_index].gen(
              {
                data: val,
                whatis_data: info.whatis.value,
                objsearch_info: info,
                plugin_set: params.gamble_config.plugins,
                parent_gen: fuzzdatagen_ref
              }
            );

            // set the fuzzed data in the object
            objsearch.objSet(cloned_in_data, info.path, gendata.data.new);

            // store the changeset entry
            fuzzdata.changeset.push(gendata);
          }
        }
      }
    });

    // return the fuzzdata
    debugger;
    return fuzzdata;
  }

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Plugin Runners %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  async matchApplicablePlugins(params: {
    data: any;
    whatis_data: whatis_matches_t;
    objsearch_info: on_key_params_t | on_val_params_t;
    plugin_set: any;
  }) {
    const matching_plugins: any = [];
    for (let idx = 0; idx < params.plugin_set.length; idx++) {
      const plugin_entry = params.plugin_set[idx];
      if (plugin_entry.chance) {
        const generated_chance = randomIntegerBetween(1, 100);
        if (!generated_chance) continue;
        if (plugin_entry.chance >= generated_chance) {
          if (await plugin_entry.plugin.match(params))
            matching_plugins.push(plugin_entry.plugin);
        }
      } else if (await plugin_entry.plugin.match(params))
        matching_plugins.push(plugin_entry);
    }
    return matching_plugins;
  }

  async selectPluginAndGenerateData(params: {
    data: any;
    whatis_data: whatis_matches_t;
    objsearch_info: on_key_params_t | on_val_params_t;
    plugin_set: any;
  }) {}
}

export {
  FuzzDataGen,
  fuzz_template_t,
  fuzzdata_plugin_info_t,
  fuzzdata_plugin_class_t,
  fuzzdata_plugin_match_params_t,
  fuzzdata_plugin_gen_params_t,
  gendata_t,
  fuzzdata_t
};
