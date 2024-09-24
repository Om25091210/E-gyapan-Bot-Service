import { SERVER_URL } from "../global/ServerURL";
import SubmitTaskResponse from "../interfaces/SubmitTaskResponse";

interface prativedanObject {
    gyapanId: string,
    prativedanUrl : string,
    submittedAt : Date
}

export const submitPrativedan = async (prativedan: prativedanObject): Promise<SubmitTaskResponse> => {
    const url = `${SERVER_URL}gyapan/prativedan/create`;
    console.log(url);
    const authOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(prativedan) // Make sure to send an object if the API expects an object
    };
    console.log("prativedan");
    console.log(prativedan);
    const response = await fetch(url, authOptions);
    console.log(response);
    const code = response.status;
    const result = await response.json();
    return { code, result };
};