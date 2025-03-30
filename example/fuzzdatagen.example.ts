/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Developer Note: If you're just copy pasting this example into your project,
// you need to change:  '@src/index' to  '@opsimathically/objectsearch'

import {
  ObjectSearchUtils,
  ObjectSearch,
  path_t,
  path_elem_t,
  on_key_params_t,
  on_val_params_t,
  simple_path_t,
  objsearch_whatis_extra_data_t
} from '@src/index';

import { whatis_plugin_t, whatis_matches_t } from '@opsimathically/whatis';

(async function () {
  /*
    IMPORTANT: 
    The concepts described for string searching below are mostly
    identical for searching other values/types.  We do not provide
    examples for each and every type for the sake of brevity.

    All of these basically work the same:
    searchStrings
    searchDeepEquals
    searchNumbers

    This works a litle bit different, so see example below:
    searchWhatisCodes
    */

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Whatis Plugin(s) Definition %%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // create a whatis plugin that looks for strings that start with
  // "http", mark them with the code "potential_http_url"
  const httpstring_plugin: whatis_plugin_t<objsearch_whatis_extra_data_t> =
    function (params: {
      value: any;
      matchset: whatis_matches_t;
      addToMatchSet: any;
      extra?: objsearch_whatis_extra_data_t;
    }) {
      // objsearch passed through extra data as it's own type which includes
      // data from it's current position in it's recursion state.  We cast it
      // here so that it can be used by type.
      /*
    type objsearch_whatis_extra_data_t = {
        objsearch_ref: ObjectSearch;
        seen: WeakSet<any>;
        path: path_elem_t[];
        parent: unknown;
        obj: unknown;
        initial_obj: unknown;
    }
    */
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

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Complex Data Definition %%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // Below we create an object, with a complex and unusual
  // layout.  Functions for map keys, objects for map keys, symbols
  // and circular references, etc. This is the data we'll be
  // searching.

  const external_obj: any = {
    something_external: 'moo',
    [Symbol('nested_symbol_obj')]: {
      symsome: 'symstring',
      symhello: 'symthere',
      testsymmap: new Map([['hi', 'whats up']])
    }
  };
  external_obj.circular_ref = external_obj;
  const complex_search_target: any = {
    foo: {
      bar: new Map<any, any>([
        [{ baz: 1 }, new Set([2, 3])],
        [function () {}, { async_func_inner: async function () {} }]
      ]),
      settest: new Set([5, 6]),
      nested: {
        something: 'here',
        nested_circular: {
          external_circular: external_obj
        }
      }
    },
    [Symbol('hidden')]: 'some_symbol_val',
    7: 8,
    9: new Map<any, any>([[10, 11]])
  };

  // Run a string search using a string literal and a regexp.
  const objsearch_utils = new ObjectSearchUtils(complex_search_target);

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Search Everything, No Filtering %%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  await objsearch_utils.search({
    key: async function (
      key: any,
      info: on_key_params_t,
      objsearch: ObjectSearch
    ) {
      // Will trigger on every key-like, of any type, and it's
      // up to you to work out what you want to do, with the information
      // and pathing you've been provided.
    },
    val: async function (
      val: any,
      info: on_key_params_t,
      objsearch: ObjectSearch
    ) {
      // will trigger on every value, same as on key.  Do what you want,
      // how you want on what is encountered.
    }
  });

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% String-Only Searching %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // this is the object we'll be searching for our string examples
  const simple_searchable_obj = {
    hello: {
      there: {
        hi: 'how are you doing?'
      }
    }
  };

  // this will hold matching string keys and vals
  const matching_string_keys: string[] = [];
  const matching_string_vals: string[] = [];

  // Run a string search using a string literal and a regexp.
  objsearch_utils.resetSearchData(simple_searchable_obj);
  await objsearch_utils.searchStrings(['hello', /how are you/], {
    key: async function (
      // the matched search term: 'hello' or /how are you/ (regexp)
      term: any,
      // the key which matched
      matched: string,
      // in depth information about the key, including complex paths, and whatis information
      info: on_key_params_t,
      // a reference to the underlying ObjectSearch class which was used for this search.
      objsearch: ObjectSearch
    ) {
      // This callback is triggered when we find a string KEY matching any
      // of our search terms.
      matching_string_keys.push(matched);
    },
    val: async function (
      term: any,
      // for value callbacks, this will be a value instead of a key, all other properties
      // will be the same as for the key callback
      matched: string,
      info: on_key_params_t,
      objsearch: ObjectSearch
    ) {
      // This callback is triggered when we find a string VALUE matching any
      // of our search terms.
      matching_string_vals.push(matched);
    }
  });

  /* 
  matching_string_keys: [ 'hello' ]
  matching_string_vals: [ 'how are you doing?' ]
  */

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Converting Complex Paths To Simple Paths %%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // When items are found, their path is stored in info.path.  This
  // path is a complex path.  Using this, you should be able use
  // objsearch.objSet()/objsearch.objGet() to get and set just about anything,
  // anywhere, in any object.
  //
  // However, complex paths are unweildly to look at, so in the following
  // example we convert the complex paths to simple paths.  These paths
  // will be simple arrays of strings/numbers so you can visualize
  // things easier:
  // e.g.
  //
  //   [ 'hello' ]
  //   [ 'hello', 'there', 'hi' ]
  //
  // It's IMPORTANT to note however, that significant information is lost
  // during the conversion, and some things simply cannot reliably be
  // converted to a simple path (nested maps/sets/symbols etc).  If you
  // need reliable paths, preserve complex paths.  If you want to visualize
  // paths, or are working with very simple objects, it's fine to simplify
  // them.

  const simple_paths: simple_path_t[] = [];
  await objsearch_utils.searchStrings(['hello', /how are you/], {
    key: async function (
      term: any,
      matched: string,
      info: on_key_params_t,
      objsearch: ObjectSearch
    ) {
      simple_paths.push(objsearch.complexPathToSimplePath(info.path));
    },
    val: async function (
      term: any,
      matched: string,
      info: on_key_params_t,
      objsearch: ObjectSearch
    ) {
      simple_paths.push(objsearch.complexPathToSimplePath(info.path));
    }
  });

  // simple_paths: [ [ 'hello' ], [ 'hello', 'there', 'hi' ] ]

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Setting/Getting Using Complex Paths %%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // this will hold a path we preserve from within the callback
  let preserved_path: path_t = [];

  await objsearch_utils.searchStrings(['hello', /how are you/], {
    val: async function (
      term: any,
      matched: string,
      info: on_key_params_t,
      objsearch: ObjectSearch
    ) {
      // set value using path from within objsearch
      if (term instanceof RegExp)
        if (term.toString() === /how are you/.toString()) {
          objsearch.objSet(simple_searchable_obj, info.path, "i'm doing fine!");
          preserved_path = info.path;
        }
    }
  });

  // simple_searchable_obj: { hello: { there: { hi: "i'm doing fine!" } } }

  // now change the value after using preserved path:
  new ObjectSearch().objSet(
    simple_searchable_obj,
    preserved_path,
    "that's great!"
  );

  // simple_searchable_obj: { hello: { there: { hi: "that's great!" } } }

  // now lookup the value using the preserved path
  const looked_up_value_from_path = new ObjectSearch().objGet(
    simple_searchable_obj,
    preserved_path
  );

  // looked_up_value_from_path: that's great!

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Searching For Whatis Codes %%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // whatis, is a utility I developed for determining what something is
  //
  // NPM: @opsimathically/whatis
  //
  // It supports extensible plugins so that you can define your own criteria
  //  for what something is by giving it  a code (read: string value).
  //
  // Both ObjectSearch and ObjectSWearchUtils can be provided whatis plugins
  // so that searching by code is simple and easy.

  // in this example we'll be searching this data
  const some_other_object_to_search: any = {
    something: {
      nested: {
        with: {
          a: new Map<any, any>([
            ['url', 'http://www.something.com/'],
            ['http://mapkeyurl.net', true]
          ]),
          and_a: new Set<any>(['https://seturl.org'])
        }
      }
    },
    also: 'https://www.otherthing.com'
  };

  // create another search utils using the plugin
  objsearch_utils.resetSearchData(some_other_object_to_search);
  objsearch_utils.resetWhatisPlugins([httpstring_plugin]);

  // this will just aggregate things that match our custom whatis code
  const potential_urls: string[] = [];

  // search by whatis code (will match on our plugin custom code)
  await objsearch_utils.searchWhatisCodes(['potential_http_url'], {
    key: async function (term: any, matched: any, info: on_key_params_t) {
      if (!info.whatis.key.codes[term]) return;
      potential_urls.push(matched);
    },
    val: async function (term: any, matched: any, info: on_val_params_t) {
      if (!info.whatis.value.codes[term]) return;
      potential_urls.push(matched);
    }
  });

  /*
  potential_urls:
  [
    'http://www.something.com/',
    'http://mapkeyurl.net',
    'https://seturl.org',
    'https://www.otherthing.com'
  ]
  */

  console.log(
    'Example finished running!  Look at the code to see how we got here.'
  );
})();
