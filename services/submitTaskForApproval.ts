import { SERVER_URL } from "../global/ServerURL";
import SubmitTaskResponse from "../interfaces/SubmitTaskResponse";

interface TaskIdObject {
    ids: Array<string>;
}

export const submitTaskForApproval = async (task_ids: TaskIdObject): Promise<SubmitTaskResponse> => {
    const url = `${SERVER_URL}task/submit`;
    const authOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(task_ids) // Make sure to send an object if the API expects an object
    };
    console.log(task_ids);
    const response = await fetch(url, authOptions);
    console.log(response);
    const code = response.status;
    const result = await response.json();
    return { code, result };
};