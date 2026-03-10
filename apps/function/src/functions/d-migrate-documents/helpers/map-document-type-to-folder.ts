import { APPEAL_DOCUMENT_TYPE } from '@planning-inspectorate/data-model';

type AppealDocumentType = (typeof APPEAL_DOCUMENT_TYPE)[keyof typeof APPEAL_DOCUMENT_TYPE];

type FolderPath = 'appellant-case' | 'lpa-questionnaire' | 'representation' | 'costs' | 'internal' | 'appeal-decision';

/**
 * Mapping from Horizon document types (source database) to APPEAL_DOCUMENT_TYPE constants
 * TODO: This mapping should be expanded as more Horizon document types are discovered during migration
 */
const HORIZON_TO_APPEAL_DOCUMENT_TYPE: Record<string, AppealDocumentType> = {
	// Confirmed mappings from Confluence
	'Abeyance (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Appeal Notification Letter': APPEAL_DOCUMENT_TYPE.APPEAL_NOTIFICATION,
	'Appellant Cost Application': APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_APPLICATION,
	'Appellant Grounds of Appeal': APPEAL_DOCUMENT_TYPE.GROUND_A_SUPPORTING,
	'Appellant Initial Documents': APPEAL_DOCUMENT_TYPE.ORIGINAL_APPLICATION_FORM,
	'Appellant Proof of Evidence': APPEAL_DOCUMENT_TYPE.APPELLANT_PROOF_OF_EVIDENCE,
	'Appellant Statement and Appendices': APPEAL_DOCUMENT_TYPE.APPELLANT_STATEMENT,
	"Appellant's Final Comments": APPEAL_DOCUMENT_TYPE.APPELLANT_FINAL_COMMENT,
	"Appellant's Statement": APPEAL_DOCUMENT_TYPE.APPELLANT_STATEMENT,
	"Appellant's Statement of Common Grounds": APPEAL_DOCUMENT_TYPE.STATEMENT_COMMON_GROUND,
	'Application Form': APPEAL_DOCUMENT_TYPE.ORIGINAL_APPLICATION_FORM,
	'Application Plans': APPEAL_DOCUMENT_TYPE.PLANS_DRAWINGS,
	'Application Withdrawn': APPEAL_DOCUMENT_TYPE.APPELLANT_CASE_WITHDRAWAL_LETTER,
	'Consultation Responses': APPEAL_DOCUMENT_TYPE.CONSULTATION_RESPONSES,
	Costs: APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_APPLICATION,
	'Costs Branch Letters': APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_CORRESPONDENCE,
	'Costs Decision': APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_DECISION_LETTER,
	'Development Plans': APPEAL_DOCUMENT_TYPE.DEVELOPMENT_PLAN_POLICIES,
	'Emerging Plans': APPEAL_DOCUMENT_TYPE.EMERGING_PLAN,
	'Environmental Assessment': APPEAL_DOCUMENT_TYPE.ENVIRONMENTAL_ASSESSMENT,
	'Environmental Statement': APPEAL_DOCUMENT_TYPE.EIA_ENVIRONMENTAL_STATEMENT,
	'Inquiry Procedure (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Inquiry Procedure (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.OTHER_PARTY_REPRESENTATIONS,
	'Inquiry Special Procedure (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.OTHER_PARTY_REPRESENTATIONS,
	'Interested Party Correspondence': APPEAL_DOCUMENT_TYPE.OTHER_PARTY_REPRESENTATIONS,
	'LPA Decision Notice': APPEAL_DOCUMENT_TYPE.APPLICATION_DECISION_LETTER,
	'LPA Final Comments': APPEAL_DOCUMENT_TYPE.LPA_FINAL_COMMENT,
	'LPA Proof of Evidence': APPEAL_DOCUMENT_TYPE.LPA_PROOF_OF_EVIDENCE,
	'LPA Statement': APPEAL_DOCUMENT_TYPE.LPA_STATEMENT,
	'MP Correspondence': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Main Party Correspondence': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Miscellaneous (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Notices Letters (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Outcome (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'Outcome with Costs (Main Party correspondence)': APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_CORRESPONDENCE,
	'Planning Obligation': APPEAL_DOCUMENT_TYPE.PLANNING_OBLIGATION,
	'Rule 6 Statement / Proof': APPEAL_DOCUMENT_TYPE.RULE_6_STATEMENT,
	'Statement of Common Ground': APPEAL_DOCUMENT_TYPE.STATEMENT_COMMON_GROUND,
	'Support Group (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE,
	'WR Procedure (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE

	// TBC mappings from Confluence (awaiting confirmation):
	// 'Abeyance (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Acknowledgement': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Appellant Final Comments': APPEAL_DOCUMENT_TYPE.TBC,
	// "Appellant's Case": APPEAL_DOCUMENT_TYPE.TBC,
	// "Appellant's Proofs of Evidence": APPEAL_DOCUMENT_TYPE.TBC,
	// 'Applicant Proofs of Evidence': APPEAL_DOCUMENT_TYPE.TBC,
	// "Applicant's Final Comments": APPEAL_DOCUMENT_TYPE.TBC,
	// "Applicant's Statement": APPEAL_DOCUMENT_TYPE.TBC,
	// 'Cancellation': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Change of Procedure (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Change of Procedure (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Charting': APPEAL_DOCUMENT_TYPE.TBC,
	// 'EIA (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'EIA Request (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Enforcement Listed Building': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Fees': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Further Information Request': APPEAL_DOCUMENT_TYPE.TBC,
	// 'General Letters & Reminders (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'General Letters (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'General Letters (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Government Office Request': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Hearing Procedure (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Hearing Procedure (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'High Court Procedure (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Initial Documents': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Interested Party Correspondence Personal': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Interested Party/Person Correspondence': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Internal Correspondence': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Internal Minutes': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Invalid Appeal-Quashing': APPEAL_DOCUMENT_TYPE.TBC,
	// 'LB Letter': APPEAL_DOCUMENT_TYPE.TBC,
	// 'LPA Committee Report': APPEAL_DOCUMENT_TYPE.TBC,
	// 'LPA Questionnaire Documents': APPEAL_DOCUMENT_TYPE.TBC,
	// 'LPA Reasons for Non-Determination': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Land Owner Statement / Proof': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Linking': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Listed Building': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Local Authority Decision': APPEAL_DOCUMENT_TYPE.TBC,
	// "Local Authority's Case": APPEAL_DOCUMENT_TYPE.TBC,
	// "Local Authority's Final Comments": APPEAL_DOCUMENT_TYPE.TBC,
	// "Local Authority's Proofs of Evidence": APPEAL_DOCUMENT_TYPE.TBC,
	// "Local Authority's Questionnaire": APPEAL_DOCUMENT_TYPE.TBC,
	// "Local Authority's Statement": APPEAL_DOCUMENT_TYPE.TBC,
	// 'Miscellaneous (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Non Application Plans': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Notice Withdrawn': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Operational Land (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Other Appeal Documents': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Other Evidence': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Other Evidence from Appellant/Agent': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Other Evidence from LPA': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Other Evidence from Statutory Parties': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Other Party Correspondence': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Outcome / Decision': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Plans Post LPA Decision': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Plans and Policies': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Post Decision': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Postponement': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Questionnaire': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Read me': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Recovery Letters': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Recovery Procedure Letters': APPEAL_DOCUMENT_TYPE.TBC,
	// "Relevant Authority's Questionnaire": APPEAL_DOCUMENT_TYPE.TBC,
	// 'Relevant Representation Attachment': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Rule 6 Parties': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Seeking Grounds and Facts': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Site Notices': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Start Letters': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Statutory Party': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Structure/ Local Plans': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Supplementary Guidance': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Third Parties': APPEAL_DOCUMENT_TYPE.TBC,
	// 'WR Procedure (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Withdrawal (Main Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Withdrawal (Other Party Correspondence)': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Written Statement of Evidence Appellant': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Written Statement of Evidence LPA': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Written Statement of Evidence Other Party': APPEAL_DOCUMENT_TYPE.TBC,
	// 'Written Statement of Evidence RA': APPEAL_DOCUMENT_TYPE.TBC
};

/**
 * Document types that go into the representation folder (representationAttachments subfolder)
 * These are the main evidence documents submitted during the representation phase
 */
const REPRESENTATION_ATTACHMENT_TYPES: AppealDocumentType[] = [
	// Confirmed representation attachment types
	APPEAL_DOCUMENT_TYPE.APPELLANT_FINAL_COMMENT,
	APPEAL_DOCUMENT_TYPE.APPELLANT_PROOF_OF_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.APPELLANT_WITNESSES_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.INTERESTED_PARTY_COMMENT,
	APPEAL_DOCUMENT_TYPE.LPA_FINAL_COMMENT,
	APPEAL_DOCUMENT_TYPE.LPA_PROOF_OF_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.LPA_STATEMENT,
	APPEAL_DOCUMENT_TYPE.LPA_WITNESSES_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.RULE_6_PROOF_OF_EVIDENCE,
	APPEAL_DOCUMENT_TYPE.RULE_6_STATEMENT,
	APPEAL_DOCUMENT_TYPE.RULE_6_WITNESSES_EVIDENCE,

	// Known APPEAL_DOCUMENT_TYPE constants with tentative representation folder placement
	// These need proper folder mappings to be confirmed during migration
	APPEAL_DOCUMENT_TYPE.CONSERVATION_DOCUMENTS,
	APPEAL_DOCUMENT_TYPE.DELEGATED_REPORT,
	APPEAL_DOCUMENT_TYPE.DEFINITIVE_MAP_AND_STATEMENT_EXTRACT,
	APPEAL_DOCUMENT_TYPE.GROUND_H_SUPPORTING,
	APPEAL_DOCUMENT_TYPE.GROUND_I_SUPPORTING,
	APPEAL_DOCUMENT_TYPE.GROUND_J_SUPPORTING,
	APPEAL_DOCUMENT_TYPE.GROUND_K_SUPPORTING,
	APPEAL_DOCUMENT_TYPE.PLAN_SHOWING_EXTENT_OF_ORDER
];

/**
 * Mapping from APPEAL_DOCUMENT_TYPE constants to folder paths
 * Based on database schema folder structure
 * Note: Representation types are handled separately via REPRESENTATION_ATTACHMENT_TYPES
 */
const DOCUMENT_TYPE_TO_FOLDER: Record<AppealDocumentType, FolderPath> = {
	// appellant-case folder
	[APPEAL_DOCUMENT_TYPE.APPELLANT_STATEMENT]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.ORIGINAL_APPLICATION_FORM]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.APPLICATION_DECISION_LETTER]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.CHANGED_DESCRIPTION]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_CASE_WITHDRAWAL_LETTER]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_CASE_CORRESPONDENCE]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.DESIGN_ACCESS_STATEMENT]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.PLANS_DRAWINGS]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.NEW_PLANS_DRAWINGS]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.PLANNING_OBLIGATION]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.OWNERSHIP_CERTIFICATE]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.OTHER_NEW_DOCUMENTS]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.ENVIRONMENTAL_ASSESSMENT]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.STATEMENT_COMMON_GROUND]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.PRIOR_CORRESPONDENCE_WITH_PINS]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.ENFORCEMENT_NOTICE]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.ENFORCEMENT_NOTICE_PLAN]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_A_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_B_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_C_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_D_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_E_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_F_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_G_SUPPORTING]: 'appellant-case',
	[APPEAL_DOCUMENT_TYPE.GROUND_A_FEE_RECEIPT]: 'appellant-case',

	// lpa-questionnaire folder
	[APPEAL_DOCUMENT_TYPE.WHO_NOTIFIED]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.WHO_NOTIFIED_SITE_NOTICE]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.WHO_NOTIFIED_LETTER_TO_NEIGHBOURS]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.WHO_NOTIFIED_PRESS_ADVERT]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.CONSERVATION_MAP]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.OTHER_PARTY_REPRESENTATIONS]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.PLANNING_OFFICER_REPORT]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.DEVELOPMENT_PLAN_POLICIES]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.TREE_PRESERVATION_PLAN]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.DEFINITIVE_MAP_STATEMENT]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.COMMUNITY_INFRASTRUCTURE_LEVY]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.SUPPLEMENTARY_PLANNING]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.EMERGING_PLAN]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.CONSULTATION_RESPONSES]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.EIA_ENVIRONMENTAL_STATEMENT]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.EIA_SCREENING_OPINION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.EIA_SCOPING_OPINION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.EIA_SCREENING_DIRECTION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.LPA_CASE_CORRESPONDENCE]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.OTHER_RELEVANT_POLICIES]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.APPEAL_NOTIFICATION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.HISTORIC_ENGLAND_CONSULTATION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.RELATED_APPLICATIONS]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.STOP_NOTICE]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.ARTICLE_4_DIRECTION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.ENFORCEMENT_LIST]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.LOCAL_DEVELOPMENT_ORDER]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.PLANNING_PERMISSION]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.LPA_ENFORCEMENT_NOTICE]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.LPA_ENFORCEMENT_NOTICE_PLAN]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.PLANNING_CONTRAVENTION_NOTICE]: 'lpa-questionnaire',
	[APPEAL_DOCUMENT_TYPE.OTHER_RELEVANT_MATTERS]: 'lpa-questionnaire',

	// costs folder
	[APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_APPLICATION]: 'costs',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_WITHDRAWAL]: 'costs',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_CORRESPONDENCE]: 'costs',
	[APPEAL_DOCUMENT_TYPE.LPA_COSTS_APPLICATION]: 'costs',
	[APPEAL_DOCUMENT_TYPE.LPA_COSTS_WITHDRAWAL]: 'costs',
	[APPEAL_DOCUMENT_TYPE.LPA_COSTS_CORRESPONDENCE]: 'costs',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_COSTS_DECISION_LETTER]: 'costs',
	[APPEAL_DOCUMENT_TYPE.LPA_COSTS_DECISION_LETTER]: 'costs',

	// internal folder
	[APPEAL_DOCUMENT_TYPE.CROSS_TEAM_CORRESPONDENCE]: 'internal',
	[APPEAL_DOCUMENT_TYPE.INSPECTOR_CORRESPONDENCE]: 'internal',
	[APPEAL_DOCUMENT_TYPE.MAIN_PARTY_CORRESPONDENCE]: 'internal',
	[APPEAL_DOCUMENT_TYPE.UNCATEGORISED]: 'internal',

	// appeal-decision folder
	[APPEAL_DOCUMENT_TYPE.CASE_DECISION_LETTER]: 'appeal-decision',

	// representation folder - these are handled by REPRESENTATION_ATTACHMENT_TYPES logic first
	// Included here for type safety completeness
	[APPEAL_DOCUMENT_TYPE.APPELLANT_FINAL_COMMENT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_PROOF_OF_EVIDENCE]: 'representation',
	[APPEAL_DOCUMENT_TYPE.APPELLANT_WITNESSES_EVIDENCE]: 'representation',
	[APPEAL_DOCUMENT_TYPE.INTERESTED_PARTY_COMMENT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.LPA_FINAL_COMMENT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.LPA_PROOF_OF_EVIDENCE]: 'representation',
	[APPEAL_DOCUMENT_TYPE.LPA_STATEMENT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.LPA_WITNESSES_EVIDENCE]: 'representation',
	[APPEAL_DOCUMENT_TYPE.RULE_6_PROOF_OF_EVIDENCE]: 'representation',
	[APPEAL_DOCUMENT_TYPE.RULE_6_STATEMENT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.RULE_6_WITNESSES_EVIDENCE]: 'representation',
	[APPEAL_DOCUMENT_TYPE.CONSERVATION_DOCUMENTS]: 'representation',
	[APPEAL_DOCUMENT_TYPE.DELEGATED_REPORT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.DEFINITIVE_MAP_AND_STATEMENT_EXTRACT]: 'representation',
	[APPEAL_DOCUMENT_TYPE.GROUND_H_SUPPORTING]: 'representation',
	[APPEAL_DOCUMENT_TYPE.GROUND_I_SUPPORTING]: 'representation',
	[APPEAL_DOCUMENT_TYPE.GROUND_J_SUPPORTING]: 'representation',
	[APPEAL_DOCUMENT_TYPE.GROUND_K_SUPPORTING]: 'representation',
	[APPEAL_DOCUMENT_TYPE.PLAN_SHOWING_EXTENT_OF_ORDER]: 'representation'
};

/**
 * Maps a Horizon document type to its APPEAL_DOCUMENT_TYPE and folder path
 *
 * - Unmapped Horizon types default to UNCATEGORISED
 * - UNCATEGORISED documents go to the 'internal' folder
 * - Callers should log warnings when UNCATEGORISED is used
 */
export function mapHorizonDocumentTypeAndFolder(
	horizonDocumentType: string,
	logger?: { warn: (message: string) => void }
): {
	appealDocumentType: string;
	folderPath: string;
} {
	const normalizedType = horizonDocumentType.trim();

	let appealDocumentType = HORIZON_TO_APPEAL_DOCUMENT_TYPE[normalizedType];

	// Fallback to UNCATEGORISED for completely unknown Horizon types (migration resilience)
	if (!appealDocumentType) {
		appealDocumentType = APPEAL_DOCUMENT_TYPE.UNCATEGORISED;
		logger?.warn(`Unmapped Horizon document type '${horizonDocumentType}' - defaulting to UNCATEGORISED`);
	}

	// Check if it's a representation attachment type first
	if (REPRESENTATION_ATTACHMENT_TYPES.includes(appealDocumentType)) {
		return { appealDocumentType, folderPath: 'representation' };
	}

	// Otherwise check the main mapping
	const folderPath = DOCUMENT_TYPE_TO_FOLDER[appealDocumentType];
	if (!folderPath) {
		throw new Error(`No folder path mapping found for document type: ${appealDocumentType}`);
	}

	return { appealDocumentType, folderPath };
}
