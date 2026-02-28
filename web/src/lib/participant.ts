export function getParticipantId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("user_id");
  }
  
  export function setParticipantId(id: string) {
    localStorage.setItem("user_id", id);
  }