class UserRoleManager {
  private role: "driver" | "passenger" = "passenger"
  private listeners: ((role: "driver" | "passenger") => void)[] = []

  setRole(newRole: "driver" | "passenger") {
    this.role = newRole
    this.listeners.forEach((listener) => listener(newRole))
  }

  getRole(): "driver" | "passenger" {
    return this.role
  }

  subscribe(listener: (role: "driver" | "passenger") => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }
}

export const userRoleManager = new UserRoleManager()
