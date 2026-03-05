export const REPRESENTATION_ATTACHMENT_TYPES = [
	'appellantFinalComment',
	'appellantProofOfEvidence',
	'interestedPartyComment',
	'lpaFinalComment',
	'lpaProofOfEvidence',
	'lpaStatement',
	'rule6ProofOfEvidence',
	'rule6Statement',
	'rule6WitnessesEvidence'
] as const;

type RepresentationAttachmentType = (typeof REPRESENTATION_ATTACHMENT_TYPES)[number];

type KnownDocumentType =
	| RepresentationAttachmentType
	| 'appellantWitnessesEvidence'
	| 'conservationDocuments'
	| 'definitiveMapAndStatementExtract'
	| 'delegatedReport'
	| 'designAndAccessStatement'
	| 'groundASupporting'
	| 'groundBSupporting'
	| 'groundCSupporting'
	| 'groundDSupporting'
	| 'groundESupporting'
	| 'groundFSupporting'
	| 'groundGSupporting'
	| 'groundHSupporting'
	| 'groundISupporting'
	| 'groundJSupporting'
	| 'groundKSupporting'
	| 'lpaWitnessesEvidence'
	| 'planShowingExtentOfOrder';

// TODO: These are placeholder document types until we establish the complete list of all Horizon document types
// from the source database. This list should be updated as more document types are discovered during migration.

export type DocumentType = KnownDocumentType | string;

/**
 * Document types with confirmed folder mappings
 * TODO: Additional mappings will be added as they are confirmed
 */
const DOCUMENT_TYPE_TO_FOLDER_PATH: Partial<Record<DocumentType, string>> = {
	appellantFinalComment: 'representation/representationAttachments',
	appellantProofOfEvidence: 'representation/representationAttachments',
	interestedPartyComment: 'representation/representationAttachments',
	lpaFinalComment: 'representation/representationAttachments',
	lpaProofOfEvidence: 'representation/representationAttachments',
	lpaStatement: 'representation/representationAttachments',
	rule6ProofOfEvidence: 'representation/representationAttachments',
	rule6Statement: 'representation/representationAttachments',
	rule6WitnessesEvidence: 'representation/representationAttachments'

	// TODO: Add additional folder mappings as they are confirmed:
	// - appellantWitnessesEvidence
	// - conservationDocuments
	// - definitiveMapAndStatementExtract
	// - delegatedReport
	// - designAndAccessStatement
	// - groundASupporting
	// - groundBSupporting
	// - groundCSupporting
	// - groundDSupporting
	// - groundESupporting
	// - groundFSupporting
	// - groundGSupporting
	// - groundHSupporting
	// - groundISupporting
	// - groundJSupporting
	// - groundKSupporting
	// - lpaWitnessesEvidence
	// - planShowingExtentOfOrder
};

export function getFolderPathForDocumentType(documentType: DocumentType | null | undefined): string | undefined {
	if (!documentType) {
		return undefined;
	}

	return DOCUMENT_TYPE_TO_FOLDER_PATH[documentType];
}

export function isRepresentationAttachment(documentType: DocumentType | null | undefined): boolean {
	if (!documentType) {
		return false;
	}

	return REPRESENTATION_ATTACHMENT_TYPES.includes(documentType as RepresentationAttachmentType);
}
