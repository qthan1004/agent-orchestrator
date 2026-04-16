export interface ToolResponseContent {
  type: string;
  text: string;
}

export interface ToolResponse {
  content: Array<ToolResponseContent>;
  isError?: boolean;
}
