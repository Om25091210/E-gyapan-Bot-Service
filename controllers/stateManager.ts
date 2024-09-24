class StateManager {
    private currentGyapanIdInQueue: string[] = [];
  
    getCurrentGyapanIdInQueue() {
      return this.currentGyapanIdInQueue;
    }
  
    addToCurrentGyapanIdInQueue(id: string) {
      if (this.currentGyapanIdInQueue.length === 0) {
        this.currentGyapanIdInQueue.push(id);
      } else {
        console.log("Gyapan ID already being processed, cannot add another.");
      }
    }
  
    clearCurrentGyapanIdInQueue() {
      this.currentGyapanIdInQueue.length = 0;
    }
  
    isGyapanInQueue() {
      return this.currentGyapanIdInQueue.length === 1;
    }
  }
  
  const stateManager = new StateManager();
  export default stateManager;
  