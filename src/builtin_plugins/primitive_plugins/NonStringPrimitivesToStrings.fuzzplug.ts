/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-this-alias */
import { whatis_matches_t } from '@opsimathically/whatis';
import { on_key_params_t, on_val_params_t } from '@opsimathically/objectsearch';
import {
  fuzzdata_plugin_info_t,
  fuzzdata_plugin_class_t,
  fuzzdata_plugin_match_params_t,
  fuzzdata_plugin_gen_params_t,
  gendata_t
} from '@src/FuzzDataGen.class';

/**
 * plugin configuration options
 */
type non_string_primitives_to_strings_config_t = {
  undefined: boolean;
  number: boolean;
  boolean: boolean;
  bigint: boolean;
  null: boolean;
};

/**
 * Will try to convert a non-string fuzz primitive, to its string representation.
 */
class NonStringPrimitivesToStrings_FuzzPlug implements fuzzdata_plugin_class_t {
  plugin_info: fuzzdata_plugin_info_t = {
    name: 'non_string_primitives_to_strings',
    version: '1.0.0',
    targets: {
      value: true
    },
    description:
      "Looks at non-string primitives (we consider null a primitive, even though technically it's not), and attempts to convert them to string versions.  Eg. null to 'null', undefined to 'undefined'"
  };

  config: non_string_primitives_to_strings_config_t;
  constructor(config: non_string_primitives_to_strings_config_t) {
    this.config = config;
  }

  /**
   * Check that the data is a non-string primitive.
   */
  async match(params: fuzzdata_plugin_match_params_t) {
    switch (true) {
      case this.config.undefined && params.whatis_data.types.undefined:
        return true;
      case this.config.number && params.whatis_data.types.number:
        return true;
      case this.config.boolean && params.whatis_data.types.boolean:
        return true;
      case this.config.bigint && params.whatis_data.types.bigint:
        return true;
      case this.config.null && params.whatis_data.codes.null:
        return true;
      default:
        return false;
    }
  }

  /**
   * Convert non-string primitive to string and return the gendata.
   */
  async gen(params: fuzzdata_plugin_gen_params_t): Promise<gendata_t> {
    const fuzzplug_ref = this;

    let new_data: any;
    switch (true) {
      case params.whatis_data.types.undefined:
        new_data = 'undefined';
        break;
      case params.whatis_data.types.number:
      case params.whatis_data.types.boolean:
      case params.whatis_data.types.bigint:
      case params.whatis_data.codes.null:
        new_data = params.data.toString();
        break;

      default:
        break;
    }
    const ret_data: gendata_t = {
      plugin_info: fuzzplug_ref.plugin_info,
      data: {
        new: new_data,
        old: params.data
      },
      whatis_data: params.whatis_data,
      objsearch_info: params.objsearch_info
    };
    return ret_data;
  }
}

export {
  NonStringPrimitivesToStrings_FuzzPlug,
  non_string_primitives_to_strings_config_t
};
