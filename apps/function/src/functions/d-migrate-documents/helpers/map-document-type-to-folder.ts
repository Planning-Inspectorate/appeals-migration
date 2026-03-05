import { APPEAL_DOCUMENT_TYPE } from '@planning-inspectorate/data-model';

/**
 * Mapping from Horizon document types (source database) to APPEAL_DOCUMENT_TYPE constants
 * TODO: This mapping should be expanded as more Horizon document types are discovered during migration
 */
const HORIZON_TO_APPEAL_DOCUMENT_TYPE: Record<
	string,
	(typeof APPEAL_DOCUMENT_TYPE)[keyof typeof APPEAL_DOCUMENT_TYPE]
> = {
	// Representation attachment types
	'Appellant Final Comment': APPEAL_DOCUMENT_TYPE.APPELLANT_FINAL_COMMENT,
	'Appellant Proof of Evidence': APPEAL_DOCUMENT_TYPE.APPELLANT_PROOF_OF_EVIDENCE,
	'Interested Party Comment': APPEAL_DOCUMENT_TYPE.INTERESTED_PARTY_COMMENT,
	'LPA Final Comment': APPEAL_DOCUMENT_TYPE.LPA_FINAL_COMMENT,
	'LPA Proof of Evidence': APPEAL_DOCUMENT_TYPE.LPA_PROOF_OF_EVIDENCE,
	'LPA Statement': APPEAL_DOCUMENT_TYPE.LPA_STATEMENT,
	'Rule 6 Proof of Evidence': APPEAL_DOCUMENT_TYPE.RULE_6_PROOF_OF_EVIDENCE,
	'Rule 6 Statement': APPEAL_DOCUMENT_TYPE.RULE_6_STATEMENT,
	'Rule 6 Witnesses Evidence': APPEAL_DOCUMENT_TYPE.RULE_6_WITNESSES_EVIDENCE

	// TODO: Add additional Horizon document type mappings as they are discovered:
	// - Appellant Witnesses Evidence -> APPEAL_DOCUMENT_TYPE.APPELLANT_WITNESSES_EVIDENCE
	// - Conservation Documents -> APPEAL_DOCUMENT_TYPE.CONSERVATION_DOCUMENTS
	// - Definitive Map and Statement Extract -> APPEAL_DOCUMENT_TYPE.DEFINITIVE_MAP_AND_STATEMENT_EXTRACT
	// - Delegated Report -> APPEAL_DOCUMENT_TYPE.DELEGATED_REPORT
	// - Design and Access Statement -> APPEAL_DOCUMENT_TYPE.DESIGN_ACCESS_STATEMENT
	// - Ground A Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_A_SUPPORTING
	// - Ground B Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_B_SUPPORTING
	// - Ground C Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_C_SUPPORTING
	// - Ground D Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_D_SUPPORTING
	// - Ground E Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_E_SUPPORTING
	// - Ground F Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_F_SUPPORTING
	// - Ground G Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_G_SUPPORTING
	// - Ground H Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_H_SUPPORTING
	// - Ground I Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_I_SUPPORTING
	// - Ground J Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_J_SUPPORTING
	// - Ground K Supporting -> APPEAL_DOCUMENT_TYPE.GROUND_K_SUPPORTING
	// - LPA Witnesses Evidence -> APPEAL_DOCUMENT_TYPE.LPA_WITNESSES_EVIDENCE
	// - Plan Showing Extent of Order -> APPEAL_DOCUMENT_TYPE.PLAN_SHOWING_EXTENT_OF_ORDER
};

export const REPRESENTATION_ATTACHMENT_TYPES = [
	APPEAL_DOCUMENT_TYPE.APPELLANT_FINAL_COMMENT,
	APPEAL_DOCUMENT_TYPE.APPELLANT_PROOF_OF_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.INTERESTED_PARTY_COMMENT,
	APPEAL_DOCUMENT_TYPE.LPA_FINAL_COMMENT,
	APPEAL_DOCUMENT_TYPE.LPA_PROOF_OF_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.LPA_STATEMENT,
	APPEAL_DOCUMENT_TYPE.RULE_6_PROOF_OF_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.RULE_6_STATEMENT,
	APPEAL_DOCUMENT_TYPE.RULE_6_WITNESSES_EVIDENCE
] as const;

/**
 * Mapping from APPEAL_DOCUMENT_TYPE constants to folder paths
 * TODO: Additional folder mappings will be added as they are confirmed
 */
const APPEAL_DOCUMENT_TYPE_TO_FOLDER_PATH: Partial<
	Record<(typeof APPEAL_DOCUMENT_TYPE)[keyof typeof APPEAL_DOCUMENT_TYPE], string>
> = {
	[APPEAL_DOCUMENT_TYPE.APPELLANT_FINAL_COMMENT]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_PROOF_OF_EVIDENCE]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.INTERESTED_PARTY_COMMENT]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.LPA_FINAL_COMMENT]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.LPA_PROOF_OF_EVIDENCE]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.LPA_STATEMENT]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.RULE_6_PROOF_OF_EVIDENCE]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.RULE_6_STATEMENT]: 'representation/representationAttachments',
	[APPEAL_DOCUMENT_TYPE.RULE_6_WITNESSES_EVIDENCE]: 'representation/representationAttachments'

	// TODO: Add additional folder mappings as they are confirmed:
	// - APPEAL_DOCUMENT_TYPE.APPELLANT_WITNESSES_EVIDENCE
	// - APPEAL_DOCUMENT_TYPE.CONSERVATION_DOCUMENTS
	// - APPEAL_DOCUMENT_TYPE.DEFINITIVE_MAP_AND_STATEMENT_EXTRACT
	// - APPEAL_DOCUMENT_TYPE.DELEGATED_REPORT
	// - APPEAL_DOCUMENT_TYPE.DESIGN_ACCESS_STATEMENT
	// - APPEAL_DOCUMENT_TYPE.GROUND_A_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_B_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_C_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_D_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_E_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_F_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_G_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_H_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_I_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_J_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.GROUND_K_SUPPORTING
	// - APPEAL_DOCUMENT_TYPE.LPA_WITNESSES_EVIDENCE
	// - APPEAL_DOCUMENT_TYPE.PLAN_SHOWING_EXTENT_OF_ORDER
};

/**
 * Maps a Horizon document type (from source database) to its corresponding folder path
 */
export function getFolderPathForDocumentType(horizonDocumentType: string | null | undefined): string | undefined {
	if (!horizonDocumentType) {
		return undefined;
	}

	const appealDocumentType = HORIZON_TO_APPEAL_DOCUMENT_TYPE[horizonDocumentType];
	if (!appealDocumentType) {
		return undefined;
	}

	return APPEAL_DOCUMENT_TYPE_TO_FOLDER_PATH[appealDocumentType];
}

/**
 * Maps a Horizon document type to its corresponding APPEAL_DOCUMENT_TYPE constant
 */
export function mapHorizonToAppealDocumentType(horizonDocumentType: string | null | undefined): string | undefined {
	if (!horizonDocumentType) {
		return undefined;
	}

	return HORIZON_TO_APPEAL_DOCUMENT_TYPE[horizonDocumentType];
}

/**
 * Checks if a Horizon document type maps to a representation attachment
 */
export function isRepresentationAttachment(horizonDocumentType: string | null | undefined): boolean {
	if (!horizonDocumentType) {
		return false;
	}

	const appealDocumentType = HORIZON_TO_APPEAL_DOCUMENT_TYPE[horizonDocumentType];
	if (!appealDocumentType) {
		return false;
	}

	return REPRESENTATION_ATTACHMENT_TYPES.includes(
		appealDocumentType as (typeof REPRESENTATION_ATTACHMENT_TYPES)[number]
	);
}
