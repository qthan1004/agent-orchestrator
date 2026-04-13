# Breadcrumb High-level UX Enhancements
Target Module: @thanh-libs/breadcrumb

# Business Requirements / User Stories

1. **Ellipsis Interaction:** 
   Ở chỗ hiển thị dấu `...` (khi bị giới hạn maxItems), nếu user muốn quay lại xem hoặc thao tác với các breadcrumb bị ẩn (cái breadcrumb cũ) thì làm thế nào? Cần thiết kế một UX mượt mà (ví dụ click mở ra menu, hoặc expand lại).

2. **Interactive Node (Dropdown/Selection):**
   Tại một node trên breadcrumb, giờ nó không chỉ là 1 cái text tĩnh nữa mà có thể là 1 cái "selection". Ví dụ: Node hiện tại trỏ về list project, khi bấm vào đó user có thể được chọn (dropdown) một project khác để nhảy trực tiếp sang `/<projectid>`. System cần hỗ trợ render custom node kiểu này.

3. **Router Auto-mapping:**
   Giả sử user có một cấu trúc router đồ sộ kiểu như thư mục `routes` trong dự án Next.js/React Router (ví dụ: `/home/administrator/workspace/identity-app/src/routes`). Làm sao để cái Breadcrumb component của mình tự động ánh xạ hoặc xài được luồng data router đó một cách liền mạch nhất mà không phải gõ tay từng `BreadcrumbItem`? Cần đưa ra base parser parser tự động từ cấu trúc Route.

4. **Home Icon Override (Edge Case):**
   Nếu người dùng yêu cầu node đầu tiên (thường là node Home `/`) *CHỈ* hiển thị cái Icon ngôi nhà thay vì hiển thị text "Home" dài thòng thì API phải thiết kế ra sao để đáp ứng được? Cần support truyền custom icon hoặc override render cho node cụ thể khi xài qua mảng routes.

*Lưu ý: Planner tự suy nghĩ kiến trúc, tự mò code xem cần override hay design Pattern nào (renderProps, composition, hook) để chẻ task cho hợp lý nhé!*
