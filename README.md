# BOOKING APP
## Lưu ý
- Sử dụng yarn.
- Sử dụng import module với alias bắt đầu là `#` + `tên thư mục trong src`.
- Khi viết API cần cho biết mô tả, đầu vào input, đầu ra output.
- Kết quả trả về của api cần tuân thủ:
    + Format của apiResponse - nằm tại utils/apiResponses.
    + Mã lỗi response cần phải chính xác nhất.
- Nội dung mặc định là ngôn ngữ tiếng anh. Cho phép đa ngôn ngữ (hiện tại là tiếng việt)   
    + Nhận biết ngôn ngữ ưu tiên bằng query param `?lang=` {vi,en}
    + Ưu tiên tiếp theo là `Accept-language` header
- [] Hiện tại upload dữ liệu lên AWS 
- cont...
