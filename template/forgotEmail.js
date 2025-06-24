export const forgotEmailTemplate = (otp) => {
  return `
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a90e2; font-size: 2em;">Welcome to Vehicle Management System</h1>
        </div>
        <div style="margin-bottom: 20px; font-size: 1.1em; color: #555;">
          <p>Hello there,</p>
          <p>
            Please verify your email. Here is your one-time passcode to update your password. It will expire in 30 minutes.
          </p>
          <h2 style="text-align: center; color: #007BFF; font-size: 1.5em;">${otp}</h2>
          <p style="text-align: center;">
            Or directly click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/reset-password?otp=${otp}" 
               style="background-color: #007BFF; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>
        </div>
        <div style="text-align: center;">
         <p>Stay connected and explore all that we have to offer!</p>
          <p style="color: #555;">
            Best regards
            </p>
            <p style="color": #555>Vehicle Management System</p>
          <p style="color: #555; font-size: 0.9em;">
            Pathankot, Punjab, India 
          </p>
        </div>
      </div>
    </body>
  `;
};
