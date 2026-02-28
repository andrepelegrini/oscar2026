export function getParticipantId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("participant_id");
  }
  
  export function setParticipantId(id: string) {
    localStorage.setItem("participant_id", id);
  }