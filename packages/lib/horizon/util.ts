export const XMLSNS = 'http://tempuri.org/';
export const SOAP_OP_PREFIX = `${XMLSNS}IHorizon/`;
export const XMLSNS_PROPS = Object.freeze({
	'__xmlns:hzn': 'http://schemas.datacontract.org/2004/07/Horizon.Business',
	'__xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance'
});

/**
 * Create a new object with all keys prefixed
 * Only supports depth of one
 *
 * @param obj
 * @param prefix
 */
export function prefixAllKeys(obj: any, prefix: string) {
	const copy: Record<string, any> = {};
	for (const [k, v] of Object.entries(obj)) {
		copy[prefix + k] = v;
	}
	return copy;
}

/**
 * The JSON returned from the Horizon REST API contains duplicate keys.
 * This function attempts to resolve the common ones, such as `AttributeValue`
 * Also single objects with a "value" property are replaced by the value directly
 *
 * @example response
 * {
 *   "CaseId": {
 *     "value": "737723"
 *   },
 *   "Attributes": {
 *     "AttributeValue": {
 *       "Name": {
 *         "value": "Case:Case Type"
 *       },
 *       "Value": {
 *         "value": "Lawful Development Certificate Appeal"
 *       }
 *     },
 *     "AttributeValue": {
 *       "Name": {
 *         "value": "Case:Procedure"
 *       },
 *       "Values": {
 *         "AttributeValue": {
 *           "Name": {
 *             "value": "Case Involvement:Case Involvement:ContactID"
 *           },
 *           "Value": {
 *             "value": "P_1176"
 *           }
 *         },
 *         "AttributeValue": {
 *           "Name": {
 *             "value": "Case Involvement:Case Involvement:Type Of Involvement"
 *           },
 *           "Value": {
 *             "value": "Appellant"
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * @param txt
 */
export function cleanHorizonResponse(txt: string): string {
	// dev warning: complex regex inbound!
	return (
		txt
			// promote values
			.replace(/{\s+"value": "(.*)"\s+}/g, '"$1"')
			// remove empty objects with null
			.replace(/{\s+}/g, 'null')
			// replace AttributeValue Name&Value pairs with a Name:Value property
			.replace(/"AttributeValue":\s{\s+"Name":\s"(.*)",\s+"Value":\s"(.*)"\s+}/g, '"$1": "$2"')
			// replace AttributeValue Name&Values with a Name:object
			.replace(/"AttributeValue":\s{\s+"Name":\s"(.*)",\s+"Values":\s{((\s+(".*"),?)+)\s+}/g, '"$1": {$2')
			// replace multiple Case Involvement entries with an array
			.replace(
				/"Case Involvement:Case Involvement":(\s({(?:\s+".*",?)+\s+},?)(\s+"Case Involvement:Case Involvement":\s({(?:\s+".*",?)+\s+},?))*)/g,
				(match, ...args) => {
					const ci = '"Case Involvement:Case Involvement":';
					const content = args[0].replaceAll(ci, '').replace(/,$/, '');
					let suffix = '';
					if (args[0].endsWith(',')) {
						suffix = ',';
					}
					return ci + '[' + content + ']' + suffix;
				}
			)
	);
}
