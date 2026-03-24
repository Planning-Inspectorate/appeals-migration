export interface ValidationError {
	sourceModel: string;
	sourceField: string;
	error: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

export type DataValidationResult = ValidationResult;

export type DocumentValidationResult = ValidationResult;

export function createValidationError(sourceModel: string, sourceField: string, error: string): ValidationError {
	return {
		sourceModel,
		sourceField,
		error
	};
}

export function createValidationSuccess(): ValidationResult {
	return {
		isValid: true,
		errors: []
	};
}

export function createValidationFailure(errors: ValidationError[]): ValidationResult {
	return {
		isValid: false,
		errors
	};
}
