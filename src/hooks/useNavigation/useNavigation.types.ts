export type Screen =
	| { type: 'alias-list' }
	| { type: 'rule-editor'; aliasName: string }
	| { type: 'rule-detail'; aliasName: string; ruleIndex: number };
