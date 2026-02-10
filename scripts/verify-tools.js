
const { DynamicStructuredTool } = require("@langchain/core/tools");
console.log("DynamicStructuredTool is:", DynamicStructuredTool);

if (DynamicStructuredTool) {
    console.log("SUCCESS: DynamicStructuredTool is defined.");
} else {
    console.error("FAILURE: DynamicStructuredTool is undefined.");
    process.exit(1);
}
