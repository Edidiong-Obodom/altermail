import { Request, Response } from "express";
import * as Helpers from "../../../../../../helpers";
import { SendMail } from "./sendMail.dto";
import * as nodemailer from "nodemailer";
import { Collection } from "mongodb";
import clientPromise from "../../../../../../../mongoDB";

export const sendMail = async (req: Request, res: Response) => {
  const currentDate = new Date();
  const timestamp = Math.floor(currentDate.getTime() / 1000);
  const fields = ["email", "subject", "mailBodyHtml"];
  const reqHeaders = ["token"];
  let credentialsCollection: Collection;

  // check data for each field in the body and validate format
  const fieldCheck = Helpers.requiredFields(req.body, fields);
  const headersCheck = Helpers.requiredFields(
    req.headers,
    reqHeaders,
    "header"
  );

  if (!fieldCheck.success)
    return res.status(400).json({ message: fieldCheck.message });

  if (!headersCheck.success)
    return res.status(400).json({ message: headersCheck.message });

  // Get values from body
  const {
    email,
    subject,
    mailBodyHtml,
    mailBodyText,
    secure,
    port,
    connectionTimeout,
    ...rest
  } = req.body as Partial<SendMail> & {
    [key: string]: any;
  };
  const { token } = req.headers;

  // Check if there are any additional properties in the request body
  const extraFields = Helpers.noExtraFields(rest);

  if (!extraFields.success) {
    return res.status(400).json({ message: extraFields.message });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    credentialsCollection = db.collection("credentials");
  } catch (error) {
    console.log(error);
    return res.status(500).json("Oops something went wrong.");
  }

  try {
    const mailDetails = await credentialsCollection.findOne({ token: token });
    if (!mailDetails) {
      return res.status(400).json({ message: "Invalid token" });
    }
    console.log(mailDetails);

    //credentials for email transportation

    const mailCredentials = {
      host: mailDetails.host,
      secure: secure !== undefined ? secure : true,
      port: port ?? 465,
      auth: {
        user: mailDetails.email,
        pass: await Helpers.decryptDataWeb(
          mailDetails.encryptedPassword,
          process.env.ENCRYPTION_KEY as string
        ),
      },
      // Increase connection timeout to 20 seconds (20000 milliseconds)
      connectionTimeout: connectionTimeout ?? 20000,
    };
    const transport = nodemailer.createTransport(mailCredentials);

    //Welcome Message
    const msg = {
      from: `${mailDetails.firstName} <${mailDetails.email}>`, // sender address
      to: email, // list of receivers
      subject, // Subject line
      text: mailBodyText, // plain text body
      html: mailBodyHtml, //HTML message
    };

    // send mail with defined transport object
    await transport.sendMail(msg);
    return res.status(200).json({
      Status: "Sent Successfully!",
      toEmail: email,
      fromEmail: mailDetails.email,
    });
  } catch (error) {
    console.log("sendMail: ", error);
    return res.status(500).json("Oops something went wrong.");
  }
};
