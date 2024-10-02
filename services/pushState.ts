import { SERVER_URL } from "../global/ServerURL";
import SubmitTaskResponse from "../interfaces/SubmitTaskResponse";

interface TaskIdObject {
    phoneNumber: string,
    WPSession: boolean,
    WPGyapanId: string,
    WPGyapanObjectId: string,
    WPprativedanURL: string
}

export const pushState = async (updated_state : TaskIdObject) : Promise<SubmitTaskResponse> =>{
    const url = `${SERVER_URL}patwari/updatedBotDetails`;
    
    const authOptions = {
        method:'POST',
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify(updated_state),
    }
    console.log(url);
    console.log(authOptions);
    const response = await fetch(url,authOptions);
    const code = response.status;
    const result = await response.json();
    console.log(result);
    return {code, result};
}