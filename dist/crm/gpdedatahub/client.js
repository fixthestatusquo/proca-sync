
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
var __importDefault = (this && this.__importDefault) || ((mod) => (mod && mod.__esModule) ? mod : { "default": mod });
Object.defineProperty(exports, "__esModule", { value: true });
exports.postAction = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.CRM_URL;
const username = process.env.CRM_USERNAME;
const password = process.env.CRM_PASSWORD;
const testUrl = process.env.CRM_TEST_URL;
const testUsername = process.env.CRM_TEST_USERNAME;
const testPassword = process.env.CRM_TEST_PASSWORD;
if (!url || !username || !password) {
    console.error("No credentials");
    process.exit(1);
}
const getEncodedToken = (username, password) => {
    return username && password
        ? Buffer.from(`${username}:${password}`).toString("base64")
        : null;
};
const tokenEncoded = getEncodedToken(username, password);
// If there is no test environment, use production credentials
const testTokenEncoded = getEncodedToken(testUsername, testPassword) || tokenEncoded;
const postAction = (action) => __awaiter(void 0, void 0, void 0, function* () {
    const isTest = action.action.testing || false;
    const requestUrl = isTest ? testUrl || url : url;
    const headers = {
        Authorization: `Basic ${isTest ? testTokenEncoded : tokenEncoded}`,
        "Content-type": "application/json",
    };
    const body = JSON.stringify(action);
    try {
        const response = yield fetch(requestUrl, {
            method: "POST",
            headers: headers,
            body: body,
        });
        // We only get status = 200 if everything is fine;
        console.log(action.actionId, requestUrl);
        return response.status;
    }
    catch (error) {
        console.error("Post error:", error);
        throw error;
    }
});
exports.postAction = postAction;
