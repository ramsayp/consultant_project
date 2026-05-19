// schemaScopedImport transformer compiles `import X from '@salesforce/schema/SObject'`
// to `X = require("@salesforce/schema/SObject").default` — so .default must be present.
const schema = { objectApiName: "Work_Item__c" };
module.exports = { __esModule: true, default: schema };
