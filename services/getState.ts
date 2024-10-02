import { SERVER_URL } from "../global/ServerURL";
import SubmitTaskResponse from "../interfaces/SubmitTaskResponse";

export const getState = async (phone_no: string): Promise<SubmitTaskResponse> => {
    // * // Will send the whatsapp msgs for pending task from App backend. //
    const url = `${SERVER_URL}patwari/getBotDetails/${phone_no}`;
    const authOptions = {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
    };
    console.log(url);
    const response = await fetch(url, authOptions);
    const code = response.status;
    const result = await response.json();
    return { code, result };
};