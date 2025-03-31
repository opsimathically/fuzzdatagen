/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert';

import { deepEqual } from 'fast-equals';
import {
  whatis,
  whatis_matches_t,
  add_match_set_func_t,
  whatis_plugin_t
} from '@opsimathically/whatis';
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

import {
  FuzzDataGen,
  fuzz_template_t,
  fuzzdata_plugin_info_t,
  fuzzdata_plugin_class_t,
  fuzzdata_plugin_match_params_t,
  fuzzdata_plugin_gen_params_t,
  gendata_t,
  fuzzdata_t,
  NonStringPrimitivesToStrings_FuzzPlug
} from '@src/index';

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

(async function () {
  const httpstring_whatis_plugin: whatis_plugin_t<objsearch_whatis_extra_data_t> =
    function (params: {
      value: any;
      matchset: whatis_matches_t;
      addToMatchSet: any;
      extra?: objsearch_whatis_extra_data_t;
    }) {
      params.extra = params.extra as objsearch_whatis_extra_data_t;

      // if it's not a string, and doesn't start with http, just return
      if (!params.matchset.codes.string) return;
      if (params.value.indexOf('http') !== 0) return;

      // if our criteria is met, add the match set
      params.addToMatchSet(params.matchset, {
        code: 'potential_http_url',
        type: 'string',
        description: 'String that starts with http, maybe a URL.'
      });
    };

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Tests %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  test('Non-string primitives to strings test', async function () {
    const gamble_config = {
      plugins: [
        {
          chance: 100,
          plugin: new NonStringPrimitivesToStrings_FuzzPlug({
            undefined: true,
            number: true,
            boolean: true,
            bigint: true,
            null: true
          })
        }
      ]
    };

    const fuzzgen = new FuzzDataGen();
    let fuzzdata: fuzzdata_t = await fuzzgen.gamble({
      in_data: 42,
      gamble_config: gamble_config
    });
    assert(fuzzdata.data === '42');

    fuzzdata = await fuzzgen.gamble({
      in_data: undefined,
      gamble_config: gamble_config
    });
    assert(fuzzdata.data === 'undefined');

    fuzzdata = await fuzzgen.gamble({
      in_data: true,
      gamble_config: gamble_config
    });
    assert(fuzzdata.data === 'true');

    fuzzdata = await fuzzgen.gamble({
      in_data: false,
      gamble_config: gamble_config
    });
    assert(fuzzdata.data === 'false');

    fuzzdata = await fuzzgen.gamble({
      in_data: 100000000000000000000000000000000000000000n,
      gamble_config: gamble_config
    });
    assert(fuzzdata.data === '100000000000000000000000000000000000000000');
  });

  test('NestedObject: Non-string primitives to strings test', async function () {
    const nested_obj_data = {
      something: {
        somewhere: {
          some_data: 42
        }
      }
    };

    const gamble_config = {
      plugins: [
        {
          chance: 100,
          plugin: new NonStringPrimitivesToStrings_FuzzPlug({
            undefined: true,
            number: true,
            boolean: true,
            bigint: true,
            null: true
          })
        }
      ]
    };

    const fuzzgen = new FuzzDataGen();
    let fuzzdata: fuzzdata_t = await fuzzgen.gamble({
      in_data: nested_obj_data,
      gamble_config: gamble_config
    });
    debugger;
  });

  test('Generate an fuzz a string', async function () {
    const string_to_fuzz = 'abcd1234efgh5678';
    const number_to_fuzz = 10;

    const fuzz_template: fuzz_template_t = {
      config: {
        fuzz: {
          strings: {
            enabled: true,
            injections: {
              min_len: 0,
              max_len: 100
            }
          }
        }
      },
      strings: {
        matchgen: async function () {}
      }
    };

    const gamble_config = {
      plugins: [
        {
          chance: 100,
          plugin: new NonStringPrimitivesToStrings_FuzzPlug({
            undefined: true,
            number: true,
            boolean: true,
            bigint: true,
            null: true
          })
        }
      ]
    };

    const whatis_plugins: whatis_plugin_t<objsearch_whatis_extra_data_t>[] = [
      httpstring_whatis_plugin
    ];

    // create a fuzz data generator
    const fuzzgen = new FuzzDataGen({
      whatis_plugins: whatis_plugins
    });

    await fuzzgen.gamble({
      in_data: number_to_fuzz,
      gamble_config: gamble_config
    });
  });
})();
