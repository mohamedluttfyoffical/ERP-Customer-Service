export type AuthActionState = {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors?: Record<string, string>;
};

export const initialAuthActionState: AuthActionState = {
  status: "idle",
};

export type ProfileActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialProfileActionState: ProfileActionState = {
  status: "idle",
};
