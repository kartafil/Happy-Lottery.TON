import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/jack_pot_master.tact',
    options: {
        debug: true
    }
};
