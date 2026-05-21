// ═══════════════════════════════════════════════════════
//  VIETNAM LOCATION AUTOCOMPLETE
// ═══════════════════════════════════════════════════════
const VIETNAM_LOCATIONS = [
  "Hà Nội","Hồ Chí Minh","Đà Nẵng","Hải Phòng","Cần Thơ","Biên Hòa","Nha Trang","Buôn Ma Thuột",
  "Huế","Vũng Tàu","Đà Lạt","Long Xuyên","Rạch Giá","Quy Nhơn","Pleiku","Hội An","Mỹ Tho",
  "Bà Rịa","Việt Trì","Hạ Long","Thái Nguyên","Nam Định","Phan Thiết","Thanh Hóa","Vinh","Thủ Đức",
  "Tân An","Bến Tre","Sóc Trăng","Cà Mau","Trà Vinh","Bạc Liêu","Châu Đốc","Sa Dec","Tây Ninh",
  "Thủ Dầu Một","Dĩ An","Thuận An","Lạng Sơn","Hòa Bình","Sơn La","Điện Biên Phủ","Lai Châu",
  "Lào Cai","Yên Bái","Tuyên Quang","Hà Giang","Cao Bằng","Bắc Kạn","Thái Bình","Ninh Bình",
  "Hà Nam","Hưng Yên","Hải Dương","Bắc Ninh","Bắc Giang","Quảng Ninh","Phú Thọ","Vĩnh Phúc",
  "Bình Dương","Bình Phước","Đồng Nai","Long An","Tiền Giang","An Giang","Kiên Giang","Hậu Giang",
  "Vĩnh Long","Đồng Tháp","Phú Yên","Khánh Hòa","Ninh Thuận","Bình Thuận","Lâm Đồng","Bình Định",
  "Quảng Ngãi","Quảng Nam","Quảng Trị","Thừa Thiên Huế","Kon Tum","Gia Lai","Đắk Lắk","Đắk Nông",
  "Bình Phước","Phú Quốc","Côn Đảo","Sa Pa","Mộc Châu","Mai Châu","Tam Cốc","Ninh Bình Phố Cổ",
  "Hội An Phố Cổ","Mỹ Sơn","Phong Nha","Bà Nà Hills","Cù Lao Chàm","Mũi Né","Long Hải","Vàm Cỏ",
  "Thác Bản Giốc","Hang Sơn Đoòng","Vịnh Hạ Long","Đảo Cát Bà","Hồ Tây","Hồ Hoàn Kiếm",
  "Suối Tiên","Đầm Sen","Thảo Cầm Viên","Phố đi bộ Nguyễn Huệ","Bờ hồ Hoàn Kiếm","Văn Miếu",
  "Chùa Hương","Chùa Bái Đính","Chùa Thiên Mụ","Nhà thờ Đức Bà","Dinh Độc Lập","Bảo tàng Lịch sử"
];

function initLocationAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Create datalist if not exists
  let datalist = document.getElementById(listId);
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = listId;
    document.body.appendChild(datalist);
  }
  input.setAttribute('list', listId);

  input.addEventListener('input', function() {
    const val = this.value.trim().toLowerCase();
    datalist.innerHTML = '';
    if (val.length < 1) return;
    
    const matches = VIETNAM_LOCATIONS.filter(loc => 
      loc.toLowerCase().includes(val) || 
      removeAccents(loc.toLowerCase()).includes(removeAccents(val))
    ).slice(0, 8);
    
    matches.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      datalist.appendChild(opt);
    });
  });
}

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D');
}

// Init when DOM ready
document.addEventListener('DOMContentLoaded', function() {
  initLocationAutocomplete('memoryLocation', 'locationList');
  initLocationAutocomplete('searchLocation', 'searchLocationList');
});
