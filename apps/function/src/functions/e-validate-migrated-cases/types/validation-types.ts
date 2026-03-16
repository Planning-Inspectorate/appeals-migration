/**
 * Validation error interface for storing detailed validation information
 */
export interface ValidationError {
	/** The model the error relates to, e.g. AppealHas */
	sourceModel: string;
	/** The field the error relates to, e.g. caseStatus */
	sourceField: string;
	/** The error message */
	error: string;
}

/**
 * Validation result interface containing both success status and detailed errors
 */
export interface ValidationResult {
	/** Overall validation success status */
	isValid: boolean;
	/** Array of validation errors (empty if validation passed) */
	errors: ValidationError[];
}

/**
 * Validation result for data validation
 */
export interface DataValidationResult extends ValidationResult {
	/** Legacy boolean compatibility */
	dataValidated: boolean;
}

/**
 * Validation result for document validation
 */
export interface DocumentValidationResult extends ValidationResult {
	/** Legacy boolean compatibility */
	documentsValidated: boolean;
}

/**
 * Creates a validation error object
 */
export function createValidationError(sourceModel: string, sourceField: string, error: string): ValidationError {
	return {
		sourceModel,
		sourceField,
		error
	};
}

/**
 * Creates a successful validation result
 */
export function createValidationSuccess(): ValidationResult {
	return {
		isValid: true,
		errors: []
	};
}

/**
 * Creates a failed validation result with errors
 */
export function createValidationFailure(errors: ValidationError[]): ValidationResult {
	return {
		isValid: false,
		errors
	};
}
