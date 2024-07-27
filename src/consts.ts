export const RESPONSE_MESSAGE_CONST = {
  SUCCESS: "Success",
  FAILURE: "Operation failed!",
  ERROR: "Something went wrong!",
};

export const CONTEXT_IDs = {
  HEALTH_CHAT: "health_chat",
  HEALTH_QUESTIONAIRE: "health_questionaire",
};

export const HEALTH_ASSESSMENT_QUESTIONS = [
    {
        id: 1,
        text: "How would you rate your overall health on a scale of 1 to 10, where 1 is very poor and 10 is excellent?",
    },
    {
        id: 2,
        text: "Do you have any existing medical conditions or chronic illnesses?",
    },
    {
        id: 3,
        text: "Are you currently taking any medications, supplements, or herbal remedies?",
    },
    {
        id: 4,
        text: "How often do you engage in physical activity or exercise?",
    },
    {
        id: 5,
        text: "What does your typical diet look like?",
    },
    {
        id: 6,
        text: "How many hours of sleep do you usually get per night?",
    },
    {
        id: 7,
        text: "Have you experienced any recent changes in your physical or mental well-being?",
    },
];

export const HASHING_CONFIG = {
    SALT_ROUNDS: 10
};

export const FAILURE_TYPES = {
    INVALID_INPUT: "Invalid input",
    OPERATION_FAILED: "Operation failed!",
    SOMETHING_WENT_WRONG: "Something went wrong!",
    LOGIN_FAILURES: {
        USER_DOES_NOT_EXIST: "User does not exist!",
        INVALID_CREDENTIALS: "Invalid credentials",
        PASSWORD_DOES_NOT_MATCH: "Password does not match",
        INVALID_REFRESH_TOKEN: "Invalid refresh token",
    },
    REGISTER_FAILURES: {
        USER_ALREADY_EXISTS: "User already exists!",
        INVALID_CREDENTIALS: "Invalid credentials",
    },
    INTERNAL_ERROR: "An internal error occured!",
};
