export * from "./credentialsTemplate";
export * from "./api-validations";
export * from "./regex";
export * from "./encryption";

export const randomNumber = () =>
    Math.floor(Math.random() * 9_000_000) + 1_000_000;
