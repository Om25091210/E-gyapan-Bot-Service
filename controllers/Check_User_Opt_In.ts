import UserOptInDetails from "../interfaces/UserOptInDetails";

const sdk = require('api')('@gupshup/v1.0#ezpvim9lcyhvffa');

export const getAllOptInUsers = async (phoneNumber: string): Promise<boolean> => {
    return sdk.getalluseroptInsforanapp({ appname: 'ProductiveGPT', apikey: 'u7maer3xezr2dsrsstbq0voosxs5g8sm' })
        .then(({ data }: { data: { users: UserOptInDetails[] } }) => {
            // Check if any user matches the phone number
            const userFound = data.users.some(item => `91${item.phoneCode}` === phoneNumber);
            return userFound;
        })
        .catch((err: Error) => {
            console.error(err);
            return false; // Return false in case of an error
        });
}
