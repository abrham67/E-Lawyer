export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Case {
  _id: string;
  title: string;
  status: string;
  client_id: string;
  lawyer_id: string;
}
