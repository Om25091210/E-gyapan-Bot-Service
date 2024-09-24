import { SERVER_URL } from "../global/ServerURL";
import SubmitTaskResponse from "../interfaces/SubmitTaskResponse";

interface TaskIdObject {
    gyapanIds: Array<string>;
}

export const markTaskAsCompleted = async (gyapanIds : TaskIdObject) : Promise<SubmitTaskResponse> =>{
    const url = `${SERVER_URL}gyapan/markHSM`;
    
    const authOptions = {
        method:'POST',
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify(gyapanIds),
    }
    console.log(authOptions);
    const response = await fetch(url,authOptions);
    const code = response.status;
    const result = await response.json();
    console.log(result);
    return {code, result};
}
