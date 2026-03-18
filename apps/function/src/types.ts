import type { InvocationContext } from '@azure/functions';
import type { BlobGetPropertiesHeaders } from '@azure/storage-blob';
import type { CaseToMigrate, DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { Readable } from 'node:stream';

export type ItemToMigrate = CaseToMigrate | DocumentToMigrate;

export type MigrationFunction = (itemToMigrate: ItemToMigrate, context: InvocationContext) => Promise<void>;

export const stepStatus = {
	waiting: 'waiting',
	queued: 'queued',
	processing: 'processing',
	complete: 'complete',
	failed: 'failed'
} as const;

export type StepStatus = (typeof stepStatus)[keyof typeof stepStatus];

type NumericFieldNames<Type> = {
	[Key in keyof Type]: Type[Key] extends number ? Key : never;
}[keyof Type];

export type StepIdField = NumericFieldNames<CaseToMigrate> | NumericFieldNames<DocumentToMigrate>;

export interface SourceDocumentParameters {
	version?: number;
	rendition?: boolean;
}
export interface SourceDocumentResponse {
	filename: string;
	stream: Readable;
}

/**
 * A client interface for getting documents from the source system
 */
export interface SourceDocumentClient {
	getDocument(documentId: string, parameters: SourceDocumentParameters): Promise<SourceDocumentResponse>;
}

export interface SinkDocumentClient {
	getBlockBlobClient(filepath: string): SinkDocumentUploadClient;
}

export interface SinkDocumentUploadClient {
	uploadStream(stream: Readable): Promise<unknown>;
	exists(): Promise<boolean>;
	getProperties(): Promise<BlobGetPropertiesHeaders>;
}
