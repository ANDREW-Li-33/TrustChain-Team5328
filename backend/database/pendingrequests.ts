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
  verificationTimestamp?: string
) {
  const updateData: any = { status: newStatus };
  if (verificationTimestamp) {
    updateData.verificationTimestamp = verificationTimestamp;
  }

  const { data, error } = await supabase
    .from("PendingRequests")
    .update(updateData)
    .eq("requestID", requestID)
    .select();

  if (error) {
    console.error("Error updating request status:", error);
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

export async function addSavedQuality(requestID: number, qualityValue : number) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .update({ savedQuality: qualityValue })
    .eq("requestID", requestID)
    .select();
  if (error) {
    console.error("Error updating saved quality metrics:", error);
    return null;
  }
  return data;
}

export async function getSavedQuality(requestID: number) {
  const { data, error } = await supabase
    .from("PendingRequests")
    .select("savedQuality")
    .eq("requestID", requestID)
    .single();

  if (error) {
    console.error("Error fetching saved quality:", error);
    return null;
  }
  return data?.savedQuality ?? null;
}

export async function getPendingRequestsOnHold() {
  const { data, error } = await supabase
    .from("PendingRequests")
    .select("*")
    .eq("status", "On Hold");
  if (error) {
    console.error("Error fetching pending requests on hold:", error);
    return null;
  }
  return data;
}