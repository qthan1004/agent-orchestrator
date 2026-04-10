---
name: Safe Deletion Protocol
description: Có trách nhiệm nhắc nhở Agent tuyệt đối không được tự ý xóa file/thư mục khi chưa hỏi ý kiến User.
---

# Safe Deletion Protocol

**CRITICAL RULE:** TUYỆT ĐỐI KHÔNG XÓA BẤT KỲ FILE HAY THƯ MỤC NÀO NẾU CHƯA ĐƯỢC NGƯỜI DÙNG CHO PHÉP RÕ RÀNG.

## Protocol

1. **Luôn Hỏi Trước (Ask First)**: Nếu trong quá trình phân tích hoặc thực thi, bạn nhận thấy cần phải dọn dẹp, xóa file, hoặc xóa thư mục (đặc biệt thông qua các lệnh nguy hiểm như `rm -rf`, `rm`), bạn BẮT BUỘC phải dừng lại và hỏi xin phép người dùng.
2. **Giải Thích Rõ Ràng**: Hãy giải thích lý do tại sao bạn nghĩ rằng file/thư mục đó nên bị xóa.
3. **Không Tự Suy Diễn**: Tuyệt đối không viện các lý do như "Tôi tưởng đây là rác", "Tôi thấy nó nằm sai chỗ", hay "Tôi nghĩ lệnh này không sao" để tự quyết định xóa. Mọi sự thay đổi có tính chất phá hủy (destructive) đều cần mộc đồng ý của User.
4. **Kiểm Soát Lệnh (Tool Constraints)**: Khi chạy lệnh bash liên quan đến xóa (`rm`, `rmdir`), luôn đảm bảo đặt cờ `SafeToAutoRun` thành `false` để bắt người dùng phải bấm nút duyệt bằng tay.

Tôn trọng dữ liệu của người dùng là ưu tiên tối cao. Việc xóa nhầm sẽ làm hỏng dự án. Hãy khắc cốt ghi tâm quy tắc này.
