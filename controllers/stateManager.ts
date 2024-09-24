class StateManager {
    // The key is the phone number, and the value is an array of Gyapan IDs for that phone number
    private sessions: { [phoneNumber: string]: string[] } = {};
  
    // Get the current Gyapan ID for a specific phone number
    getCurrentGyapanIdInQueue(phoneNumber: string) {
      return this.sessions[phoneNumber]?.[0] || "0/0";  // Return the first ID if exists, else null
    }
  
    // Add a Gyapan ID to a specific phone number's session
    addToCurrentGyapanIdInQueue(phoneNumber: string, id: string) {
      if (!this.sessions[phoneNumber]) {
        this.sessions[phoneNumber] = [];  // Initialize the session for the phone number if it doesn't exist
      }
  
      if (this.sessions[phoneNumber].length === 0) {
        this.sessions[phoneNumber].push(id);
      } else {
        console.log(`Gyapan ID already being processed for phone number ${phoneNumber}, cannot add another.`);
      }
    }
  
    // Clear the session (Gyapan IDs) for a specific phone number
    clearCurrentGyapanIdInQueue(phoneNumber: string) {
      if (this.sessions[phoneNumber]) {
        this.sessions[phoneNumber].length = 0;
      }
    }
  
    // Check if a specific phone number has a session with a Gyapan ID in the queue
    isGyapanInQueue(phoneNumber: string) {
      return this.sessions[phoneNumber]?.length === 1 || false;  // Return true if the session has exactly 1 Gyapan ID
    }
  }
  
  const stateManager = new StateManager();
  export default stateManager;
  