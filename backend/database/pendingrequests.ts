import { supabase } from "../supabaseClient.js";

export async function addRequest(request: {
  operatorID: number;
  jobID: number;
  status: "Pending" | "On Hold";
  requestTimestamp?: string;
  verificationTimestamp?: string;
}) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .insert([
      {
        operatorID: request.operatorID,
        jobID: request.jobID,
        status: request.status,
        requestTimestamp: request.requestTimestamp || new Date().toISOString(), // defaults to current time
        verificationTimestamp: request.verificationTimestamp || null, // defaults to null, will change when verified
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error("Error inserting Request:", error);
    return null;
  }

  console.log("Inserted Request:", data);
  return data;
}

export async function getRequests() {
  const { data, error } = await supabase
    .from("PendingRequests")
    .select(
      "*, operator:Users (userID, organizationName, email), currJob:Jobs (jobID, jobTitle)"
    );
  if (error) {
    console.error("Error fetching requests:", error);
    return null;
  }

  console.log("!!!!!!!!", data);
  return data;
}

// used to update approved or denied requests as complete
export async function updateRequestStatus(
  requestID: number,
  newStatus: "Pending review" | "On Hold" | "Approved" | "Denied",
  verificationTimestamp?: string,
  denialReason?: string
) {
  const updateData: any = { status: newStatus };
  if (verificationTimestamp) {
    updateData.verificationTimestamp = verificationTimestamp;
  }
  if (denialReason !== undefined && denialReason !== null && denialReason.trim() !== "") {
    // Store denial reason in verificationNotes field (Supabase column name may vary)
    // Try camelCase first, then snake_case as fallback
    updateData.verificationNotes = denialReason.trim();
  }
  const { data, error } = await supabase
    .from("PendingRequests")
    .update(updateData)
    .eq("requestID", requestID)
    .select();
  if (error) {
    console.error("Error updating request status:", error);
    console.error("Update data attempted:", updateData);
    console.error("Error details:", JSON.stringify(error, null, 2));
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error hint:", error.hint);
    
    // If verificationNotes fails, try verification_notes (snake_case)
    if (error.message && (error.message.includes("verificationNotes") || error.message.includes("verification_notes") || error.code === "PGRST204")) {
      console.log("Retrying with snake_case column name...");
      const retryData: any = { status: newStatus };
      if (verificationTimestamp) {
        retryData.verificationTimestamp = verificationTimestamp;
      }
      if (denialReason !== undefined && denialReason !== null && denialReason.trim() !== "") {
        retryData.verification_notes = denialReason.trim();
      }
      const retryResult = await supabase
        .from("PendingRequests")
        .update(retryData)
        .eq("requestID", requestID)
        .select();
      if (retryResult.error) {
        console.error("Retry also failed:", retryResult.error);
        console.error("Retry error details:", JSON.stringify(retryResult.error, null, 2));
        // Try without the denial reason field - maybe the column doesn't exist
        console.log("Retrying without denial reason field...");
        const finalRetryData: any = { status: newStatus };
        if (verificationTimestamp) {
          finalRetryData.verificationTimestamp = verificationTimestamp;
        }
        const finalRetryResult = await supabase
          .from("PendingRequests")
          .update(finalRetryData)
          .eq("requestID", requestID)
          .select();
        if (finalRetryResult.error) {
          console.error("Final retry also failed:", finalRetryResult.error);
          return null;
        }
        console.warn("Request status updated but denial reason could not be saved. Column may not exist in database.");
        return finalRetryResult.data;
      }
      return retryResult.data;
    }
    return null;
  }
  return data;
}

export async function getRequestsByOperatorID(operatorID: number) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .select("*")
    .eq("operatorID", operatorID);
  if (error) {
    console.error("Error fetching requests by operator ID:", error);
    return null;
  }
  return data;
}

export async function getRequestByJobID(jobID: number) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .select("*")
    .eq("jobID", jobID);
  if (error) {
    console.error("Error fetching requests by job ID:", error);
    return null;
  }
  return data;
}

export async function getOneRequest(requestID: number) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .select("*")
    .eq("requestID", requestID)
    .single();
  if (error) {
    console.error("Error fetching request by ID:", error);
    return null;
  }
  return data;
}

export async function deleteRequest(requestID: number) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .delete()
    .eq("requestID", requestID)
    .select();
  if (error) {
    console.error("Error deleting request:", error);
    return null;
  }
  return data;
}

async function testConnection() {
  const { data, error } = await supabase.from("PendingRequests").select("*");
  if (error) {
    console.error("Supabase query error:", error);
  } else {
    console.log("Supabase PendingRequests Data:", data);
  }
}

