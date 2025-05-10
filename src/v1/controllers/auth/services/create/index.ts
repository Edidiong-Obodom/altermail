import { Request, Response } from "express";
import { User } from "./createUser.dto";
import * as nodemailer from "nodemailer";
import * as Helpers from "../../../../../helpers/index";
import randomString from "random-string";
import clientPromise from "../../../../../../mongoDB";
import { Collection } from "mongodb";

interface ExtendUser extends User {
  code: string;
}

export const sendVerificationCode = async (req: Request, res: Response) => {
  const fields = ["email", "password", "firstName", "lastName", "host"];
  const currentDate = new Date();
  const timestamp = Math.floor(currentDate.getTime() / 1000);
  let limboCollection: Collection;
  let credentialsCollection: Collection;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    limboCollection = db.collection("limbo");
    credentialsCollection = db.collection("credentials");
  } catch (error) {
    console.log(error);
    return res.status(500).json("Oops something went wrong.");
  }

  // check data for each field in the body and validate format
  const fieldCheck = Helpers.requiredFields(req.body, fields);

  if (!fieldCheck.success)
    return res.status(400).json({ message: fieldCheck.message });

  // Validate email format
  if (!Helpers.emailRegex.test(req.body.email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  // Get values from body
  const { email, password, firstName, lastName, host, ...rest } =
    req.body as User & {
      [key: string]: any;
    };

  // Check if there are any additional properties in the request body
  const extraFields = Helpers.noExtraFields(rest);

  if (!extraFields.success) {
    return res.status(400).json({ message: extraFields.message });
  }
  // Check if password length lesser than 8 characters
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must have a minimum of 8 characters." });
  }

  // verification code
  const emailVCode = randomString({ length: 5 });

  try {
    // deletes client from limbo
    await limboCollection.deleteOne({ email });

    // checks if user already exists
    const user = await credentialsCollection.findOne({ email });

    // action if user already exists
    if (user) {
      return res.status(409).json({ message: "User already exist!" });
    }

    //   encrypt the password
    const encryptedPassword = await Helpers.encryptDataWeb(
      password,
      process.env.ENCRYPTION_KEY as string
    );

    // Insert details into limbo
    await limboCollection.insertOne({
      email,
      host,
      firstName,
      lastName,
      encryptedPassword,
      code: emailVCode,
      status: "pending",
      timestamp,
    });

    //credentials for email transportation
    const transport = nodemailer.createTransport(Helpers.mailCredentials);

    //sends verification code to clients mail
    const msg = {
      from: "Altermail <no-reply@altermail.com>", // sender address
      to: email, // list of receivers
      subject: "Email Verification", // Subject line
      text: `Here is your verification code: ${emailVCode}`, // plain text body
      html: `<h3>Email Verification</h3>
      <p>Here is your verification code: <strong>${emailVCode}</strong></p>`, //HTML message
    };

    // send mail with defined transport object
    await transport.sendMail(msg);
    return res.status(200).json({
      Status: "Sent Successfully!",
      toEmail: email,
    });
  } catch (error) {
    console.log("sendVerificationCode: ", error);
    return res.status(500).json("Oops something went wrong.");
  }
};

export const register = async (req: Request, res: Response) => {
  const fields = ["email", "code"];
  const currentDate = new Date();
  const timestamp = Math.floor(currentDate.getTime() / 1000);
  let limboCollection: Collection;
  let credentialsCollection: Collection;
  // check data for each field in the body and validate format
  const fieldCheck = Helpers.requiredFields(req.body, fields);

  if (!fieldCheck.success)
    return res.status(400).json({ message: fieldCheck.message });

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    limboCollection = db.collection("limbo");
    credentialsCollection = db.collection("credentials");
  } catch (error) {
    console.log(error);
    return res.status(500).json("Oops something went wrong.");
  }

  // Get values from body
  const {
    email,
    code: feCode,
    ...rest
  } = req.body as Partial<ExtendUser> & {
    [key: string]: any;
  };

  // Validate email format
  if (!Helpers.emailRegex.test(req.body.email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  // Check if there are any additional properties in the request body
  const extraFields = Helpers.noExtraFields(rest);

  if (!extraFields.success) {
    return res.status(400).json({ message: extraFields.message });
  }

  try {
    // Check if user already exists
    const user = await credentialsCollection.findOne({ email });

    if (user) {
      return res.status(409).json({ message: "User already exists!" });
    }

    // gets the real verification code
    const code = await limboCollection.findOne({ email });

    // checks if code was sent to the email
    if (!code) {
      return res
        .status(400)
        .json({ message: "No code was sent to this email." });
    }

    // checks if the code entered is valid
    if (code.code !== feCode) {
      return res.status(400).json({ message: "Incorrect Code." });
    }
    delete code.status;
    delete code.code;
    delete code._id;
    // verification code
    const token = randomString({ length: 20 });

    // create credentials
    await credentialsCollection.insertOne({ ...code, token });

    // deletes client from limbo
    await limboCollection.deleteOne({ email });

    //credentials for email transportation
    const transport = nodemailer.createTransport(Helpers.mailCredentials);

    //Welcome Message
    const msg = {
      from: "Altermail <no-reply@altermail.com>", // sender address
      to: email, // list of receivers
      subject: "Welcome To Altermail", // Subject line
      text: `${code.firstName} thank you for choosing Altermail. Here's your token ${token}`, // plain text body
      html: `<h2>Welcome To Reventlify</h2>
        <p>${code.firstName} thank you for choosing <strong>Altermail</strong>. Here's your token ${token}</p>`, //HTML message
    };

    // send mail with defined transport object
    await transport.sendMail(msg);

    // return
    return res.status(200).json({
      registration: "Successful!",
      user_created: email,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Oops something went wrong..." });
  }
};

// export { register, sendVerificationCode };
