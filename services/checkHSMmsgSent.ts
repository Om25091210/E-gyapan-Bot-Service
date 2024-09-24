import { SERVER_URL } from "../global/ServerURL";
import SubmitTaskResponse from "../interfaces/SubmitTaskResponse";

export const checkHSM_msgSent = async (task_id: string, status : string): Promise<SubmitTaskResponse> => {
    // * // Will send the whatsapp msgs for pending task from App backend. //
    const url = `${SERVER_URL}task/${task_id}/checkHSMmsg/${status}`;
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