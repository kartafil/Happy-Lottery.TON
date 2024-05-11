import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/jack_pot_user.tact',
    options: {
        debug: true
    }
};
