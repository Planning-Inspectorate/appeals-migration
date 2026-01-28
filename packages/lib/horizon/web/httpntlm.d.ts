declare module 'httpntlm' {
	export interface ntlm {
		createType1Message: (options: NTLMOptions) => string;
		parseType2Message: (type2msg: string, callback: () => Error) => Type2Message | null;
		createType3Message: (type2msg: Type2Message, options: NTLMOptions) => string;
	}

	export type Type2Message = {
		negotiateFlags: number;
		serverChallenge: Buffer;
		targetInfo: Buffer;
		// there are other properties not used
	};

	export interface NTLMOptions {
		username: string;
		password: string;
		// there are other properties we don't use
	}

	export default { ntlm };
}
