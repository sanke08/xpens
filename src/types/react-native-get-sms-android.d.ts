declare module "react-native-get-sms-android" {
  interface SmsFilter {
    box?: "inbox" | "sent" | "draft" | "outbox" | "failed" | "queued";
    minDate?: number;
    maxDate?: number;
    bodyRegex?: string;
    address?: string;
    maxCount?: number;
    indexFrom?: number;
    read?: 0 | 1;
    _id?: string;
  }

  interface SmsMessage {
    _id: string;
    thread_id: string;
    address: string;
    person: string | null;
    date: string;
    date_sent: string;
    protocol: string | null;
    read: string;
    status: string;
    type: string;
    body: string;
    service_center: string | null;
  }

  const SmsAndroid: {
    list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void,
    ): void;
  };

  export default SmsAndroid;
}
