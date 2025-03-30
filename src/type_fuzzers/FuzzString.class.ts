import { fuzz_template_t } from '@src/index';

type fuzz_string_injection_t = {
  injection_position_in_original_string: number;
  injected: string;
};

type fuzz_string_context_t = {
  type: 'string';
  original: string;
  fuzzed: string;
  injections: fuzz_string_injection_t[];
};

class FuzzString {
  constructor() {}

  async genFuzzedString(params: {
    in_data: string;
    fuzz_template: fuzz_template_t;
  }): Promise<fuzz_string_context_t> {
    // define initial string context
    const fuzz_context: fuzz_string_context_t = {
      type: 'string',
      original: params.in_data,
      fuzzed: '',
      injections: []
    };

    // return the fuzz context
    return fuzz_context;
  }
}

export { FuzzString };
