//pm2 start ./pm2-config.json
//pm2 logs 0

var path = require('path');
const express = require('express');
const app = express();
const bcrypt = require('bcrypt-nodejs');
const PORT = 443;
const requestIp = require('request-ip');

app.use('/js', express.static(path.join(__dirname, '/js')));
app.use('/lib', express.static(path.join(__dirname, '/lib')));
app.use('/vendor', express.static(path.join(__dirname, '/vendor')));
app.use('/css', express.static(path.join(__dirname, '/css')));
app.use('/scss', express.static(path.join(__dirname, '/scss')));
app.use('/img', express.static(path.join(__dirname, '/img')));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


const mysql2 = require("mysql2/promise");
const _pool = mysql2.createPool({
host: "ekfkawnl.synology.me",
user: "root",
password: "root",
port: "49153",
dateStrings: "date",
connectionLimit: 10,
});

async function _getConn() {
return await _pool.getConnection(async (conn) => conn);
}
async function asyncQuery(sql, params = []) {
const conn = await _getConn();
try {
const [rows, _] = await conn.query(sql, params);
conn.release();
return rows;
} catch (err) {
console.log(
  `!! asyncQuery Error \n::${err}\n[sql]::${sql}\n[Param]::${params}`
);
} finally {
conn.release();
}
return false;
}

app.listen(PORT, "0.0.0.0", () => {
console.log(`server started on PORT ${PORT} // ${new Date()}`);
});

// DB커넥트 끊키는거 막기 위함
setInterval(refreshWedges, 36000);
async function refreshWedges() {
   let row = await asyncQuery(`SELECT * from winlux_materials.today limit 0`);
}


app.get("/", async (req, res) => {

res.render("home")
});

app.get("/test", async (req, res) => {
res.render("test")
});




// 작업일지 메인
app.get("/work_log", async (req, res) => {
	
	let presence = await asyncQuery(`
									
									SELECT * FROM winlux_materials.today
									where dateTime = DATE_FORMAT(now(), "%Y-%m-%d")
									
									`)
		if(presence==""){
			let insert1 = await asyncQuery(`
										INSERT INTO winlux_materials.today (dateTime,UpdateTime)
										VALUES (DATE_FORMAT(now(), "%Y-%m-%d"),now())
										`)
			for(var i = 1; i<51; i++){
				let insert2 = await asyncQuery(`
											INSERT INTO winlux_materials.work_option
											(machine_no,dateTime)
											VALUES (${i},DATE_FORMAT(now(), "%Y-%m-%d"));
											`)
			}
		}
	
	
				let row = await asyncQuery(`
									SELECT 
									dateTime,
									user1 ,
									user2 ,
									user3 ,
									am_user,
									pm_user
									from winlux_materials.today
									where dateTime = DATE_FORMAT(now(), "%Y-%m-%d")
									
									`)


				let op = await asyncQuery(`
									 select 
										   * 
										   from (select
												   machine_no,
												   am_work_time ,
												   am_break ,
												   pm_work_time ,
												   pm_break ,
												   item ,
												   qty,
												   color,
												   state,
												   datetime
												   from winlux_materials.work_option 
												   order by dateTime desc
													LIMIT 18446744073709551615
										   ) as a
										   where datetime = DATE_FORMAT(now(), "%Y-%m-%d")
										   group by machine_no
										  order by machine_no
									`)
				
				let item = await asyncQuery(`
									select 
										*
									from winlux_materials.product_info
									group by item 
									`)
res.render("work_log",{row:row,op:op,item:item})
});

// 작업일지 달력 이벤트 get
app.get("/work_log/:date", async (req, res) => {
		let presence = await asyncQuery(`
									
									SELECT * FROM winlux_materials.today
									where dateTime = '${req.params.date}'
									
									`)
		if(presence==""){
			let insert1 = await asyncQuery(`
										INSERT INTO winlux_materials.today (dateTime,UpdateTime)
										VALUES ('${req.params.date}',now())
										`)
			for(var i = 1; i<51; i++){
				let insert2 = await asyncQuery(`
											INSERT INTO winlux_materials.work_option
											(machine_no,dateTime)
											VALUES (${i},'${req.params.date}');
											`)
			}
		}
		
		
		let row = await asyncQuery(`
									SELECT 
									dateTime,
									user1 ,
									user2 ,
									user3 ,
									am_user,
									pm_user
									from winlux_materials.today
									where dateTime = '${req.params.date}'
									`)
				let op = await asyncQuery(`
										 select 
										   * 
										   from (select
												   machine_no,
												   am_work_time ,
												   am_break ,
												   pm_work_time ,
												   pm_break ,
												   item ,
												   color,
												   qty,
												   state,
												   datetime
												   from winlux_materials.work_option 
												   order by dateTime desc
													LIMIT 18446744073709551615
										   ) as a
										   where datetime = '${req.params.date}'
										   group by machine_no
										  order by machine_no
										`)
				let item = await asyncQuery(`
									select 
										*
									from winlux_materials.product_info
									group by item 
									`)
res.render("work_log",{row:row,op:op,item:item})
});

// 작업일지 user 저장
app.post("/save_today", async (req, res) => {

	let today = await asyncQuery(`
						UPDATE winlux_materials.today
						SET user1='${req.body.user1}',
						user2='${req.body.user2}',
						user3='${req.body.user3}',
						am_user='${req.body.am_user}',
						pm_user='${req.body.pm_user}'
						where datetime = '${req.body.dateTime}'
						`)
res.send('y');
});

// 작업일지 오전 파트 저장
app.post("/am_button_chek", async (req, res) => {
	let option = await asyncQuery(`
									UPDATE winlux_materials.work_option
									SET am_break= '${req.body.break}',
									am_work_time = '${req.body.work_time}'
									where machine_no = '${req.body.machine_no}'
									and datetime = '${req.body.dateTime}'
						`)
res.send('y');
});

// 작업일지 오후 파트 저장
app.post("/pm_button_chek", async (req, res) => {
	let option = await asyncQuery(`
									UPDATE winlux_materials.work_option
									SET pm_break= '${req.body.break}',
									pm_work_time = '${req.body.work_time}'
									where machine_no = '${req.body.machine_no}'
									and datetime = '${req.body.dateTime}'
						`)
res.send('y');
});

// 작업일지 생산 파트 저장
app.post("/work_button_chek", async (req, res) => {
	let option = await asyncQuery(`
									UPDATE winlux_materials.work_option
									SET qty= '${req.body.break}',
									item = '${req.body.work_time}',
									state = '1',
									color = '${req.body.color}'
									where machine_no = '${req.body.machine_no}'
									and datetime = '${req.body.dateTime}'
						`)
res.send('y');
});

// 작업일지 생산 파트 검사 등록
app.post("/examination_add", async (req, res) => {
	let option = await asyncQuery(`
									UPDATE winlux_materials.work_option
									SET state= '2',
									s_and_l = '생직',
									client = '윈럭스',
									updateTime = now()
									where machine_no = '${req.body.machine_no}'
									and datetime = '${req.body.dateTime}'
						`)
res.send('y');
});

app.post("/selectNum", async (req, res) => {
	let item = await asyncQuery(`SELECT color FROM winlux_materials.product_info WHERE item = '${req.body.item}'`);
	res.send(item);
});

// 해포검사일지
app.get("/examination_log", async (req, res) => {
	
	let row = await asyncQuery(`
									SELECT
									no,
									client ,
									item ,
									color ,
									dateTime ,
									machine_no ,
									op_width_1,
									op_width_2 ,
									qty ,
									unit,
									etc,
									state,
									manufacturing_time,
									manufacturing_qty,
									s_and_l
									from winlux_materials.work_option
									where state in (2,3,4)
									order by updateTime DESC 
									`)
		let item = await asyncQuery(`
									select 
										*
									from winlux_materials.product_info
									group by item 
									`)
				res.render("examination_log",{row:row,item:item})		
});

/*
// 해포검사일지 달력 선택 이벤트
app.get("/examination_log/:date", async (req, res) => {

		// let presence = await asyncQuery(`
		// 							SELECT manufacturing_time
		// 							from winlux_materials.work_option
		// 							where manufacturing_time = '${req.params.date}'
		// 							`)
		
			let row = await asyncQuery(`
											SELECT
											no,
											client ,
											item ,
											color ,
											dateTime ,
											machine_no ,
											op_width_1,
											op_width_2 ,
											qty ,
											unit,
											etc,
											state,
											manufacturing_time,
											manufacturing_qty
											from winlux_materials.work_option
											where state in(1,2)
											
											`)
			
				const happyNewYear = new Date(`${req.params.date}`);
				const year = happyNewYear.getFullYear();
				const month = happyNewYear.getMonth() + 1;
				const date = happyNewYear.getDate();
				var y = year;
				var m = month >= 10 ? month : '0'+month;
				var d = date >= 10 ? date : '0' + date;
				var full_day = y + "-" + m + "-" + d;
	
			if(row==""){
				var arr= [{manufacturing_time: full_day,no:'x'}]
				res.render("examination_log",{row:arr})
			}
			else{
				res.render("examination_log",{row:row})		
			}
});
*/

// 해포 검사 일지 등록 버튼
app.post("/examination_save", async (req, res) => {
	let option = await asyncQuery(`
									UPDATE winlux_materials.work_option
									SET 
									manufacturing_time = '${req.body.work_date}',
									op_width_1 = '${req.body.op_width_1}',
									op_width_2 = '${req.body.op_width_2}',
									unit = '${req.body.unit}',
									manufacturing_qty = '${req.body.manufacturing_qty}',
									etc = '${req.body.etc}',
									state = '3',
									updateTime = now()
									where no = '${req.body.no}'
						`)
res.send('y');
});

// 해포 검사 일지 추가 버튼
app.post("/examination_add_save", async (req, res) => {
	let option = await asyncQuery(`
									INSERT INTO winlux_materials.work_option
									(
									manufacturing_time,
									s_and_l,
									state,
									item,
									qty,
									color,
									client,
									op_width_1,
									op_width_2,
									unit,
									manufacturing_qty,
									etc
									)
									VALUES 
									(
									'${req.body.work_date_add}',
									'${req.body.s_and_l_add}',
									'2',
									'${req.body.item_add}',
									'${req.body.qty_add}',
									'${req.body.color_add}',
									'${req.body.client_add}',
									'${req.body.op_width_1_add}',
									'${req.body.op_width_2_add}',
									'${req.body.unit_add}',
									'${req.body.manufacturing_qty_add}',
									'${req.body.etc_add}'
									)
						`)
res.send('y');
});

app.get("/day_log", async (req, res) => {
		let row = await asyncQuery(`
										SELECT
										a.no,
										a.dateTime ,
										a.item ,
										a.machine_no,
										a.qty,
										a.o_qty,
										a.o_qty_old,
										a.x_qty,
										a.etc2,
										a.manufacturing_time,
										a.state,
										a.color,
										a.manufacturing_qty,
										b.code
									from winlux_materials.work_option as a
									inner join winlux_materials.product_info as b
									on a.color = b.color 
									and a.item = b.item 
									where a.state in('3','4')
									order by a.updateTime DESC 
									`)
									
res.render("day_log",{row:row})		
		
});

app.get("/day_log/:no", async (req, res) => {
	page = req.params.no;
	let row = await asyncQuery(`
									SELECT
									a.no,
									a.dateTime ,
									a.item ,
									a.machine_no,
									a.qty,
									a.o_qty,
									a.o_qty_old,
									a.x_qty,
									a.etc2,
									a.manufacturing_time,
									a.state,
									a.color,
									a.manufacturing_qty,
									b.code
								from winlux_materials.work_option as a
								inner join winlux_materials.product_info as b
								on a.color = b.color 
								and a.item = b.item 
								where a.state in('3','4')
								order by a.updateTime DESC 
								`)
								let his = await asyncQuery(`
								select * from winlux_materials.shipment_info si 
								where option_key = ${req.params.no}
								order by updateTime DESC 
								`)
res.render("day_log_no",{row:row,
				  his:his,
				page:page})		
	
});

// 일일 검사 현황 등록 버튼
app.post("/day_log_save", async (req, res) => {
	var qty1 = req.body.manufacturing_qty
	var qty2 = req.body.o_qty_old
	var qty = qty1-qty2;
	if(qty < 0){
		res.send('n');
	}
	else{
		let option = await asyncQuery(`
										UPDATE winlux_materials.work_option
										SET
										o_qty_old = '${req.body.o_qty_old}',
										o_qty = '${req.body.oqty_sum}',
										x_qty = '${req.body.x_qty}',
										etc2 = '${req.body.etc2}',
										day_log_time = '보류',
										manufacturing_qty = '${qty}'
										where no = '${req.body.no}'
							`)
			var new_qr = new Date().getTime();
			let INSERT = await asyncQuery(`
										INSERT INTO winlux_materials.shipment_info(
										qr,
										code,
										item,
										color,
										option_key,
										o_qty,
										etc
										)
										VALUES (
										'${new_qr}',
										'${req.body.code}',
										'${req.body.item}',
										'${req.body.color}',
										'${req.body.no}',
										'${req.body.o_qty_old}',
										'${req.body.etc2}'
										)
			`)
			res.send('y');
		}

});

// // 거래처 정보
// app.get("/customer_info", async (req, res) => {
// 	let row = await asyncQuery(`
// 							SELECT 
// 								*
// 							from winlux_materials.customer_info ci
// 							`);
	
// 	res.render("customer_info",{row:row});
// });


// //기준 정보 >> 거래처 정보 >> 등록
// app.post("/customer_info_add", async (req, res) => {
// 		let add = await asyncQuery(`INSERT INTO winlux_materials.customer_info (
// 								client_name,
// 								business_number,
// 								ceo,
// 								phone_number,
// 								address,
// 								type_select,
// 								mutual,
// 								address1,
// 								address2,
// 								address3,
// 								address4,
// 								address5,
// 								fax_number,
// 								business_type,
// 								business_type1,
// 								ceo_phone_number,
// 								email
// 								)
// 					VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
// 										  [req.body.client_name,
// 										   req.body.business_number,
// 										   req.body.ceo,
// 										   req.body.phone_number,
// 									  	   req.body.address,
// 									  	   req.body.type_select,
// 										   req.body.mutual,
// 										   req.body.address1,
// 										   req.body.address2,
// 										   req.body.address3,
// 										   req.body.address4,
// 										   req.body.address5,
// 										   req.body.fax_number,
// 										   req.body.business_type,
// 										   req.body.business_type1,
// 										   req.body.ceo_phone_number,
// 										   req.body.email
// 									  	   ]);
// 	res.send('y');
// });

// //기준 정보 >> 거래처 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
// app.post("/customer_info_update_select", async (req, res) => {
// 	let row = await asyncQuery(`SELECT * from winlux_materials.customer_info where no = ${req.body.no}`);
// 	res.send(row);
// });

// //기준 정보 >> 거래처 정보 >> 수정
// app.post("/customer_info_update", async (req, res) => {
// 	var client_name = req.body.client_name;
// 	var business_number = req.body.business_number;
// 	var ceo = req.body.ceo;
// 	var phone_number = req.body.phone_number;
// 	var address = req.body.address;
// 	var type_select = req.body.type_select;
// 	var mutual = req.body.mutual;
// 	var address1 = req.body.address1;
// 	var address2 = req.body.address2;
// 	var address3 = req.body.address3;
// 	var address4 = req.body.address4;
// 	var address5 = req.body.address5;
// 	var fax_number = req.body.fax_number;
// 	var business_type = req.body.business_type;
// 	var business_type1 = req.body.business_type1;
// 	var ceo_phone_number = req.body.ceo_phone_number;
// 	var email = req.body.email;
	
// 	if(client_name==""){client_name=''}
// 	if(business_number==""){business_number=''}
// 	if(ceo==""){ceo=''}
// 	if(phone_number==""){phone_number=''}
// 	if(address==""){address=''}
// 	if(type_select==""){type_select=''}
// 	if(mutual==""){mutual=''}
// 	if(address1==""){address1=''}
// 	if(address2==""){address2=''}
// 	if(address3==""){address3=''}
// 	if(address4==""){address4=''}
// 	if(address5==""){address5=''}
// 	if(fax_number==""){fax_number=''}
// 	if(business_type==""){business_type=''}
// 	if(business_type1==""){business_type1=''}
// 	if(ceo_phone_number==""){ceo_phone_number=''}
// 	if(email==""){email=''}
	
// 	let row = await asyncQuery(`UPDATE winlux_materials.customer_info
// 								set client_name='${client_name}',
// 									business_number='${business_number}',
// 									ceo='${ceo}',
// 									phone_number='${phone_number}',
// 									address='${address}',
// 									type_select='${type_select}',
// 									mutual='${mutual}',
// 									address1='${address1}',
// 									address2='${address2}',
// 									address3='${address3}',
// 									address4='${address4}',
// 									address5='${address5}',
// 									fax_number='${fax_number}',
// 									business_type='${business_type}',
// 									business_type1='${business_type1}',
// 									ceo_phone_number='${ceo_phone_number}',
// 									email='${email}'
// 									where no = ${req.body.no}`);
// 	res.send('y');
// });

// //기준 정보 >> 거래처 정보 >> 체크박스 삭제
// app.post("/customer_info_delete", async (req, res) => {
// 	if (req.body.chList) {
//     const sParm =
//       typeof req.body.chList == "string"
//         ? req.body.chList
//         : req.body.chList.join(",");
//     if (!(await asyncQuery(`DELETE FROM winlux_materials.customer_info WHERE no IN (${sParm})`)))
//       return res.send(
//         `<script>alert('삭제 실패'); location='/customer_info';</script>`
//       );
//   }
//   res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/customer_info';</script>`);
// });



// 재고 관리
app.get("/inventory_manag", async (req, res) => {
	let row = await asyncQuery(`
								select 
										qr,
										item,
										color,
										sum(o_qty) as o_qty ,
										code,
										no
									from winlux_materials.shipment_info as a
									where yn = 'n'
									group by item,color
									`)
res.render("inventory_manag",{row:row})
});

// 출하 현황
app.get("/shipment_manag", async (req, res) => {
	let row = await asyncQuery(`
									select 
										*
									from winlux_materials.shipment_info
									where yn = 'n'
									
									`)
	let customer = await asyncQuery(`
									select 
										*
									from winlux_materials.customer_info
									`)
	
res.render("shipment_manag",{row:row,customer:customer})
});

app.post("/client_name_post", async (req, res) => {
	let row = await asyncQuery(`
								select 
										*
									from winlux_materials.customer_info
									where client_name = '${req.body.client_name}'
									`);
	res.send(row);
});

// app.post("/shipment_add", async (req, res) => {
// 	let row = await asyncQuery(`		
// 						INSERT INTO winlux_materials.shipment_his (
// 						item,
// 						color,
// 						code,
// 						shipment_date,
// 						shipment_qty,
// 						client_name,
// 						qr
// 						)
// 						VALUES (
// 						'${req.body.item}',
// 						'${req.body.color}',
// 						'${req.body.code}',
// 						'${req.body.shipment_date}',
// 						'${req.body.o_qty}',
// 						'${req.body.client_name}',
// 						'${req.body.qr}'
// 						);
// 					`);
// 		let UPDATE = await asyncQuery(`		
// 						UPDATE winlux_materials.shipment_info 
// 						set yn = 'y'
// 						where qr = '${req.body.qr}'
// 					`);
// 	res.send('y');
// });


// //기준 정보 >> 제품 정보
// app.get("/product_info", async (req, res) => {
// 	let row = await asyncQuery(`
// 							SELECT 
// 								*
// 							from winlux_materials.product_info
// 							`);
// 	let inventory = await asyncQuery(`
// 									select 
// 										item,
// 										color,
// 										sum(o_qty) as o_qty 
// 									from winlux_materials.work_option
// 									where not o_qty is null
// 									group by item, color 
// 									`)
// 	res.render("product_info",{row:row,inventory:inventory});
// });


// //기준 정보 >> 제품 정보 >> 등록
// app.post("/product_info_add", async (req, res) => {
// 		let add = await asyncQuery(`INSERT INTO winlux_materials.product_info (
// 								item,
// 								color,
// 								code
// 								)
// 					VALUES (?,?,?)`,
// 										  [req.body.item,
// 										   req.body.color,
// 										   req.body.code
// 									  	   ]);
// 	res.send('y');
// });

// //기준 정보 >> 제품 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
// app.post("/product_info_update_select", async (req, res) => {
// 	let row = await asyncQuery(`SELECT * from winlux_materials.product_info where no = ${req.body.no}`);
// 	res.send(row);
// });

// //기준 정보 >> 제품 정보 >> 수정
// app.post("/product_info_update", async (req, res) => {
// 	var item = req.body.item;
// 	var color = req.body.color;
// 	var code = req.body.code;
// 	if(item==""){item=''}
// 	if(color==""){color=''}
// 	if(code==""){code=''}
	
// 	let row = await asyncQuery(`UPDATE winlux_materials.product_info
// 								set item='${item}',
// 									color='${color}',
// 									code='${code}'
// 									where no = ${req.body.no}`);
// 	res.send('y');
// });

// //기준 정보 >> 제품 정보 >> 체크박스 삭제
// app.post("/product_info_delete", async (req, res) => {
// 	if (req.body.chList) {
//     const sParm =
//       typeof req.body.chList == "string"
//         ? req.body.chList
//         : req.body.chList.join(",");
//     if (!(await asyncQuery(`DELETE FROM winlux_materials.product_info WHERE no IN (${sParm})`)))
//       return res.send(
//         `<script>alert('삭제 실패'); location='/product_info';</script>`
//       );
//   }
//   res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/product_info';</script>`);
// });


app.post("/ship_add_select", async (req, res) => {
	let row = await asyncQuery(`
							select 
										*
									from winlux_materials.shipment_info
									where code =  ${req.body.code}
									`);
	res.send(row);
});


app.get("/shipment_his", async (req, res) => {
	let row = await asyncQuery(`
									select 
										code,
										item,
										color,
										o_qty,
										qr,
										shipment_time
									from winlux_materials.shipment_info
									where yn = 'y'
									`)
res.render("shipment_his",{row:row})
});


app.post("/shipment_processing", async (req, res) => {
	let row = await asyncQuery(`
								UPDATE winlux_materials.shipment_info
									SET yn='y',
										shipment_time = now()
									WHERE qr = '${req.body.qr}'
									`);
	res.send(row);
});



//기준 정보 >> 표준 코드
app.get('/standard_code', async (req, res) => {
	let standard_facility = await asyncQuery(`
											SELECT  
												no,
												machine_name ,
												machine_type ,
												model ,
												manager ,
												location ,
												etc ,
												updatetime 
											FROM mes_win.standard_facility										
											`);
	let standard_process = await asyncQuery(`
											SELECT 
												no,
												process ,
												process_details ,
												manager ,
												etc ,
												updatetime 
											from mes_win.standard_process
											`);
	res.render('standard_info/standard_code', {
		standard_facility: standard_facility,
		standard_process: standard_process,
	});
});

//기준 정보 >> 표준 설비
app.get('/standard_facility', async (req, res) => {
	let row = await asyncQuery(`  
							SELECT  
								no,  
								machine_name ,  
								machine_type ,  
								model ,  
								manager ,  
								location ,  
								etc ,  
								updatetime  
							FROM mes_win.standard_facility  
							ORDER BY no desc  
							`);
	res.render('standard_info/standard_facility', { row: row });
});

//기준 정보 >> 표준 설비 >> 등록
app.post('/standard_facility_add', async (req, res) => {
	let result = await asyncQuery(`
								select 
									a.* 
								from mes_win.standard_facility a 
								where a.machine_name = '${req.body.machine_name}'
								`);
	if (result != 0) {
		res.send('n');
	} else {
		let add = await asyncQuery(
			`
								INSERT INTO mes_win.standard_facility 
									(machine_name,machine_type,model,manager,location,etc)
								VALUES (?,?,?,?,?,?)`,
			[
				req.body.machine_name,
				req.body.machine_type,
				req.body.model,
				req.body.manager,
				req.body.location,
				req.body.etc,
			]
		);
		res.send('y');
	}
});

//기준 정보 >> 표준 설비 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/standard_facility_update_select', async (req, res) => {
	let row = await asyncQuery(`
							SELECT 
								* 
							from mes_win.standard_facility 
							where no = ${req.body.no}
							`);
	res.send(row);
});

//기준 정보 >> 표준 설비 >> 수정
app.post('/standard_facility_update', async (req, res) => {
	var machine_name = req.body.machine_name;
	var machine_type = req.body.machine_type;
	var model = req.body.model;
	var manager = req.body.manager;
	var location = req.body.location;
	var etc = req.body.etc;
	if (machine_name == '') {
		machine_name = '';
	}
	if (machine_type == '') {
		machine_type = '';
	}
	if (model == '') {
		model = '';
	}
	if (manager == '') {
		manager = '';
	}
	if (location == '') {
		location = '';
	}
	if (etc == '') {
		etc = '';
	}
	let row = await asyncQuery(`
								UPDATE mes_win.standard_facility
								set machine_name='${machine_name}',
									machine_type='${machine_type}',
									model='${model}',
									manager='${manager}',
									location='${location}',
									etc='${etc}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 표준 설비 >> 체크박스 삭제
app.post('/standard_facility_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		let rows = await asyncQuery(`
								SELECT  
									no,
									machine_name ,
									machine_type ,
									model ,
									manager ,
									location ,
									etc ,
									updatetime 
								FROM mes_win.standard_facility
								where no in(${sParm})									
		`);
		if (rows != '') {
			if (
				!(await asyncQuery(`
								DELETE FROM mes_win.standard_facility 
								WHERE no IN (${sParm})`))
			) {
				return res.send(
					`<script>alert('삭제 실패'); location='/standard_facility';</script>`
				);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/standard_facility';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/standard_facility';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/standard_facility';</script>`);
});

//기준 정보 >> 표준 공정
app.get('/standard_process', async (req, res) => {
	let row = await asyncQuery(`
								SELECT 
									no,
									process ,
									process_details ,
									manager ,
									etc ,
									updatetime 
								from mes_win.standard_process	
								ORDER BY no desc
							`);
	res.render('standard_info/standard_process', { row: row });
});

//기준 정보 >> 표준 공정 >> 등록
app.post('/standard_process_add', async (req, res) => {
	let result = await asyncQuery(`
									select 
										a.* 
									from mes_win.standard_process a 
									where a.process = '${req.body.process}'
								`);
	if (result != 0) {
		res.send('n');
	} else {
		let add = await asyncQuery(
			`
									INSERT INTO mes_win.standard_process (process,process_details,manager,etc)
						VALUES (?,?,?,?)`,
			[req.body.process, req.body.process_details, req.body.manager, req.body.etc]
		);
		res.send('y');
	}
});

//기준 정보 >> 표준 공정 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/standard_process_update_select', async (req, res) => {
	let row = await asyncQuery(`SELECT * from mes_win.standard_process where no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 표준 공정 >> 수정
app.post('/standard_process_update', async (req, res) => {
	var process = req.body.process;
	var process_details = req.body.process_details;
	var manager = req.body.manager;
	var etc = req.body.etc;
	if (process == '') {
		process = '';
	}
	if (process_details == '') {
		process_details = '';
	}
	if (manager == '') {
		manager = '';
	}
	if (etc == '') {
		etc = '';
	}
	let row = await asyncQuery(`UPDATE mes_win.standard_process
								set process='${process}',
									process_details='${process_details}',
									manager='${manager}',
									etc='${etc}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 표준 공정 >> 체크박스 삭제
app.post('/standard_process_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		let rows = await asyncQuery(`
								SELECT  
									no	
								FROM mes_win.standard_process
								where no in(${sParm})									
		`);
		if (rows != '') {
			if (
				!(await asyncQuery(`DELETE FROM mes_win.standard_process WHERE no IN (${sParm})`))
			) {
				return res.send(
					`<script>alert('삭제 실패'); location='/standard_process';</script>`
				);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/standard_process';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/standard_process';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/standard_process';</script>`);
});

//기준 정보 >> 거래처 정보
app.get('/customer_info', async (req, res) => {
	let row = await asyncQuery(`
							SELECT 
								no,
								client_name ,
								business_number ,
								ceo ,
								DATE_FORMAT(open_date, "%Y-%m-%d") as open_date ,
								corporate_number ,
								address ,
								head_address ,
								occupation ,
								item ,
								email
							from mes_win.customer_info ci
							ORDER BY no desc
							`);
	res.render('standard_info/customer_info', { row: row });
});

//기준 정보 >> 거래처 정보 >> 등록
app.post('/customer_info_add', async (req, res) => {
	let result = await asyncQuery(`
								select a.* from mes_win.customer_info a where a.client_name = '${req.body.client_name}'
								`);
	if (result != 0) {
		res.send('n');
	} else {
		let add = await asyncQuery(
			`
								INSERT INTO mes_win.customer_info (
									client_name,
									business_number,
									ceo,
									open_date,
									corporate_number,
									address,
									head_address,
									occupation,
									item,
									email
									)
								VALUES (?,?,?,?,?,?,?,?,?,?)`,
			[
				req.body.client_name,
				req.body.business_number,
				req.body.ceo,
				req.body.open_date,
				req.body.corporate_number,
				req.body.address,
				req.body.head_address,
				req.body.occupation,
				req.body.item,
				req.body.email,
			]
		);
		res.send('y');
	}
});

//기준 정보 >> 거래처 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/customer_info_update_select', async (req, res) => {
	let row = await asyncQuery(`
							SELECT 
								no,
								client_name ,
								business_number ,
								ceo ,
								DATE_FORMAT(open_date, "%Y-%m-%d") as open_date ,
								corporate_number ,
								address ,
								head_address ,
								occupation ,
								item ,
								email
							from mes_win.customer_info
								where no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 거래처 정보 >> 수정
app.post('/customer_info_update', async (req, res) => {
	var client_name = req.body.client_name;
	var business_number = req.body.business_number;
	var ceo = req.body.ceo;
	var phone_number = req.body.phone_number;
	var address = req.body.address;
	if (client_name == '') {
		client_name = '';
	}
	if (business_number == '') {
		business_number = '';
	}
	if (ceo == '') {
		ceo = '';
	}
	if (phone_number == '') {
		phone_number = '';
	}
	if (address == '') {
		address = '';
	}
	let row = await asyncQuery(`UPDATE mes_win.customer_info
								set client_name='${client_name}',
									business_number='${business_number}',
									ceo='${ceo}',
									open_date='${req.body.open_date}',
									corporate_number='${req.body.corporate_number}',
									address='${req.body.address}',
									head_address='${req.body.head_address}',
									occupation='${req.body.occupation}',
									item='${req.body.item}',		
									email='${req.body.email}'		
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 거래처 정보 >> 체크박스 삭제
app.post('/customer_info_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		let rows = await asyncQuery(`
								SELECT  
									no	
								FROM mes_win.customer_info
								where no in(${sParm})									
		`);
		if (rows == '') {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/customer_info';</script>`
			);
		} else {
			if (!(await asyncQuery(`DELETE FROM mes_win.customer_info WHERE no IN (${sParm})`))) {
				return res.send(`<script>alert('삭제 실패'); location='/customer_info';</script>`);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/customer_info';</script>`
				);
			}
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/customer_info';</script>`);
});

//기준 정보 >> 사원 정보
app.get('/employee_info', async (req, res) => {
	let select = await asyncQuery(`select * from mes_win.user_info`);
	res.render('standard_info/employee_info', { select: select });
});

//기준 정보 >> 사원 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/login_info_update_select', async (req, res) => {
	let row = await asyncQuery(`SELECT * from mes_win.user_info where no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 사원 정보 >> 수정
app.post('/login_info_update', async (req, res) => {
	var employee_code = req.body.employee_code;
	var name = req.body.name;
	var department = req.body.department;
	let pw = bcrypt.hashSync(req.body.pass);	

	if (employee_code == '') {
		employee_code = '';
	}
	if (name == '') {
		name = '';
	}
	if (department == '') {
		department = '';
	}

	let row = await asyncQuery(`UPDATE mes_win.user_info
								set id='${employee_code}',
									name='${name}',
									department='${department}',
									pass='${pw}',
									updatetime=sysdate()									
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 사원정보 >> 체크박스 삭제
app.post('/employee_info_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		
		let rows = await asyncQuery(`
								SELECT  
									no	
								FROM mes_win.user_info
								where no in(${sParm})									
		`);
		if (rows != '') {
			if (!(await asyncQuery(`DELETE FROM mes_win.user_info WHERE no IN (${sParm})`))) {
				return res.send(`<script>alert('삭제 실패'); location='/employee_info';</script>`);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/employee_info';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/employee_info';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/employee_info';</script>`);
});

//제품 관리 >> 수주 등록
app.get('/order_add', async (req, res) => {
	let row = await asyncQuery(`SELECT no,
									   order_key,
									   item,
									   order_place,
									   order_manager,
									   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
									   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
									   process,
									   order_content,
									   qty
									   FROM mes_win.process ORDER BY (no) DESC
									   `);
	let customer_info = await asyncQuery(`SELECT * from mes_win.customer_info`);
	let process = await asyncQuery(`SELECT * from mes_win.standard_process`);
	let product = await asyncQuery(`SELECT * from mes_win.product_info`);
	res.render('product_manage/order_add', {
		row: row,
		customer_info: customer_info,
		process: process,
		product: product,
	});
});

//기준 정보 >> 수주 등록 >> 등록
app.post('/order_add_add', async (req, res) => {
	console.log('req.body.item:' + req.body.item);
	let result = await asyncQuery(`
								select * from mes_win.product_info a where a.item = '${req.body.item}'
								`);
	if (result == 0) {
		res.send('n');
	} else {
		var process_new = req.body.process.slice(0, -1);
		console.log(process_new);
		const today = new Date();
		const to_day = today.toISOString().substring(2, 10).replace(/-/g, '');
		//let key_value_row = "OD-" + to_day + "-"
		let add = await asyncQuery(
			`INSERT INTO mes_win.process (
												order_place,
												order_manager,
												order_time,
												shipment_time,
												process,
												order_content,
												order_key,item,
												qty,state,
												order_updatetime
												)
												VALUES (?,?,?,?,?,?,?,?,?,?,now())`,
			[
				req.body.order_place,
				req.body.order_manager,
				req.body.order_time,
				req.body.shipment_time,
				process_new,
				req.body.order_content,
				0,
				req.body.item,
				req.body.qty,
				0,
			]
		);
		console.log(add.insertId);
		let key_value = to_day + '' + add.insertId;
		let order_key_add = await asyncQuery(
			`UPDATE mes_win.process SET order_key = '${key_value}' WHERE no = ${add.insertId}`
		);
		res.send('y');
	}
});

//기준 정보 >> 수주 등록 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/order_add_update_select', async (req, res) => {
	arr_process = [];
	let row = await asyncQuery(`SELECT no,
									   order_key,
									   item,
									   order_place,
									   order_manager,
									   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
									   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
									   process,
									   order_content,
									   qty
									   FROM DG.order_add where no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 수주 등록 >> 수정
app.post('/order_add_update', async (req, res) => {
	var order_place = req.body.order_place;
	var order_manager = req.body.order_manager;
	var order_time = req.body.order_time;
	var shipment_time = req.body.shipment_time;
	var process = req.process;
	var order_content = req.order_content;
	var item = req.item;
	var qty = req.qty;
	if (order_place == '') {
		order_place = '';
	}
	if (order_manager == '') {
		order_manager = '';
	}
	if (order_time == '') {
		order_time = '';
	}
	if (shipment_time == '') {
		shipment_time = '';
	}
	if (process == '') {
		process = '';
	}
	if (order_content == '') {
		order_content = '';
	}
	if (item == '') {
		item = '';
	}
	if (qty == '') {
		qty = '';
	}
	let row = await asyncQuery(`UPDATE DG.order_add
								set order_place='${order_place}',
									order_manager='${order_manager}',
									order_time='${order_time}',
									shipment_time='${shipment_time}',
									process='${process}',
									order_content='${order_content}',
									qty='${qty}',
									item='${item}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 수주 등록 >> 체크박스 삭제
app.post('/order_add_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		let rows = await asyncQuery(`
								SELECT a.no,
									   a.item,
									   a.state 
								FROM mes_win.process a								
								where a.no in (${sParm})																																
								and a.state not in (0)																		
							`);
		if (rows == '') {
			if (!(await asyncQuery(`DELETE FROM mes_win.process WHERE no IN (${sParm})`))) {
				return res.send(`<script>alert('삭제 실패'); location='/order_add';</script>`);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/order_add';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('작업지시 내역이 존재하여 삭제할 수 없습니다.'); location='/order_add';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/order_add';</script>`);
});

//기준정보 >> 수주등록 >> 기준정보 셀렉트 박스를 들고오기 위한 post
app.post('/order_add_select_num', async (req, res) => {
	let customer_info = await asyncQuery(
		`SELECT * FROM mes_win.customer_info WHERE client_name = '${req.body.index}'`
	);
	res.send(customer_info);
});

//제품 관리 >> 품목정보
app.get('/product_info', async (req, res) => {
	let row = await asyncQuery(`
								with tempA as (
									select 
									a.no,
									a.item
									from mes_win.product_info a
								), tempB as(
									SELECT									
										a.order_key ,
										a.quality ,
										SUM( a.qty ) as qty,
										b.item ,
										c.work_qty 
									FROM 
									mes_win.defective_history a 
										left join mes_win.process b
										on a.order_key = b.order_key
										left join mes_win.shipping_history c
										on a.order_key = c.order_key
									where a.quality in ('o','r')
									GROUP by b.item
									)select		
										a.no,
										a.item,
										b.qty as qty2,
										b.work_qty ,
										IFNULL(b.qty,0)-IFNULL(b.work_qty,0) as qty
									from tempA a
									LEFT JOIN tempB b on a.item = b.item
									where a.item not in ('기타')
									order by no desc
							`);

	res.render('standard_info/product_info', { row: row });
});

//기본정보 >> 품목등록
app.post('/product_info_add', async (req, res) => {
	console.log('req.body.product_info:' + req.body.product_info);
	let result = await asyncQuery(`
								select * from mes_win.product_info a where a.item = '${req.body.product}'
								`);
	if (result != 0) {
		res.send('n');
	} else {
		let add = await asyncQuery(
			`INSERT INTO mes_win.product_info (item)
									VALUES (?)`,
			[req.body.product]
		);
		res.send('y');
	}
});

//제품 관리 >> 품목정보 row 클릭시
app.get('/product_info_detail/:name', async (req, res) => {
	let row = await asyncQuery(`
								with tempA as (
									select 
									a.no,
									a.item
									from mes_win.product_info a
								), tempB as(
									SELECT									
										a.order_key ,
										a.quality ,
										SUM( a.qty ) as qty,
										b.item ,
										c.work_qty 
									FROM 
									mes_win.defective_history a 
										left join mes_win.process b
										on a.order_key = b.order_key
										left join mes_win.shipping_history c
										on a.order_key = c.order_key
									where a.quality in ('o','r')
									GROUP by b.item
									)select		
										a.no,
										a.item,
										b.qty as qty2,
										b.work_qty ,
										IFNULL(b.qty,0)-IFNULL(b.work_qty,0) as qty
									from tempA a
									LEFT JOIN tempB b on a.item = b.item
									where a.item not in ('기타')
									order by no desc
							`);
	let row2 = await asyncQuery(`
								select 
								DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as date,
								a.qty ,
								a.comment 
								from mes_win.defective_history a
								left join mes_win.process b
								on a.order_key = b.order_key 
								where b.item = '${req.params.name}' and a.quality in('o','r')	
	`);

	let row3 = await asyncQuery(`
								select 
								DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as date,
								a.work_qty ,
								a.coment 
								from mes_win.shipping_history a
								left join mes_win.process b
								on a.order_key = b.order_key 	
								where b.item = '${req.params.name}'
	`);
	let row4 = `${req.params.name}`;
	res.render('standard_info/product_info_detail', {
		row: row,
		row2: row2,
		row3: row3,
		row4: row4,
	});
});

//제품 관리 >> 출하등록
app.get('/shipping_add', async (req, res) => {
	let shipping_order = await asyncQuery(`
								SELECT
									a.no ,
									a.order_key ,
									a.item ,
									a.qty ,
									a.order_place ,
									DATE_FORMAT(a.order_time, "%Y-%m-%d") as order_time,
									DATE_FORMAT(a.shipment_time,"%Y-%m-%d") as shipment_time ,									
									a.order_content ,
									a.state
								FROM mes_win.process a 
								WHERE a.state = 5
								`);

	res.render('product_manage/shipping_add', { shipping_order: shipping_order });

	// var arr = [];
	// console.log(shipping_order)

	// for (i = 0 ; i<shipping_order.length ; i++){
	// 	arr[i] = "SP-"+shipping_order[i].order_key.substring(3,15)
	// }

	// res.render("product_manage/shipping_add" , {shipping_order : shipping_order , arr : arr});
});

// 7.출하등록
app.post('/shipping_run_ready', async (req, res) => {
	let rows = await asyncQuery(`
								select 
									a.no as no ,
									a.order_key
								from mes_win.shipping_history a
								where a.order_key = '${req.body.order_key}'
								`);
	console.log(rows);
	res.send(rows);
});

app.post('/shipping_run', async (req, res) => {
	console.log('출하시작 shipping_run');
	let add = await asyncQuery(
		`INSERT INTO mes_win.shipping_history 
										   (order_key,
										   work_qty,
										   coment
										   )
										   VALUES (?,?,?)`,
		[req.body.order_key, req.body.qty, req.body.ship_coment]
	);

	let update = await asyncQuery(`
									UPDATE mes_win.process a
									set a.state=${req.body.state}
									where a.order_key = '${req.body.order_key}'
								`);
	let select = await asyncQuery(`
									select 
									a.no,
									a.order_key 
									from mes_win.shipping_history a
									where a.order_key = '${req.body.order_key}'		
								`);
	res.send(select);
});

app.post('/shipping_run_update', async (req, res) => {
	let update = await asyncQuery(`
									UPDATE mes_win.shipping_history a
									set a.work_key='${req.body.sh_key}'
									where a.order_key = '${req.body.order_key}'
									`);
	res.send('y');
});

//제품 관리 >> 출하등록 데이터 매핑
app.post('/shipping_add_select', async (req, res) => {
	let detail_row = await asyncQuery(`SELECT  
												no,
												order_key,
												request_time ,
												item ,
												DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
												DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
												check_qty ,
												order_qty ,
												check_start_time,
												check_end_time ,
												ok_qty ,
												def_qty ,
												state
											FROM DG.order_document a 
											WHERE a.state in(6,7,8,9) and a.order_key = '${req.body.no}'
											ORDER BY order_key DESC
								`);

	let order_place = await asyncQuery(`SELECT
											  order_place
											FROM DG.order_add  
											WHERE order_key = '${req.body.no}'
													`);
	var counting_const = count_row[0].count + 1;
	console.log(detail_row);
	res.send({ detail_row: detail_row, count_row: counting_const, order_place: order_place });
});

//제품 관리 >> 출하등록 > 출하등록 팝업 > 수정버튼 클릭시 데이터 넣는 POST
app.post('/shipping_add_add', async (req, res) => {
	console.log(req.body);

	let add = await asyncQuery(
		`INSERT INTO DG.shipping_history 
										   (UpdateTime,
										   order_key,
										   shipping_key,
										   order_time,
										   shipment_time,
										   shipment_qty,
										   shipment_content,
										   shipment_place
										   )
										   VALUES (now(),?,?,?,?,?,?,?)`,
		[
			req.body.order_key,
			req.body.shipment_key,
			req.body.order_time,
			req.body.shipment_time,
			req.body.shipment_qty,
			req.body.shipment_content,
			req.body.shipment_place,
		]
	);
	console.log(req.body);
	res.send('y');
});

//제품 관리 >> 출하 현항
app.get('/shipping_con', async (req, res) => {
	let shipping_order = await asyncQuery(`	
												SELECT  
													a.order_key ,
													a.item ,
													a.qty ,
													a.order_place ,
													a.order_manager ,
													DATE_FORMAT(a.order_time , "%Y-%m-%d") as order_time ,															
													DATE_FORMAT(a.shipment_time , "%Y-%m-%d") as shipment_time ,													
													a.order_content ,
													b.coment ,
													DATE_FORMAT(b.updatetime , "%Y-%m-%d") as updatetime												 
												FROM mes_win.process as a
												inner join mes_win.shipping_history as b
												on a.order_key = b.order_key 									
											`);
	// var arr = [];
	// console.log(shipping_order)

	// for (i = 0 ; i<shipping_order.length ; i++){
	// 	arr[i] = "SP-"+shipping_order[i].order_key.substring(3,15)
	// }

	res.render('product_manage/shipping_con', { shipping_order: shipping_order });
});

// 제품 관리 >> 출하 현황 데이터 매핑 POST
app.post('/shipping_con_select', async (req, res) => {
	let shipping_history_row = await asyncQuery(`SELECT 
													order_key,
													shipping_key,
													DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
													DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
													shipment_qty,
													shipment_content,
													shipment_place
												 FROM DG.shipping_history 
												 WHERE order_key = '${req.body.order_key}'
													  `);

	res.send(shipping_history_row);
});

//제품 관리 >> 수주 현황
app.get('/order_con', async (req, res) => {
	let row = await asyncQuery(`
		   							   SELECT 
										   no,
										   order_key,
										   item,
										   order_place,
										   order_manager,
										   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
										   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
										   process,
										   order_content,
										   qty
									   FROM mes_win.process ORDER BY (no) DESC`);
	res.render('product_manage/order_con', { row: row });
});

//제품 관리 >> 거래 명세서
app.get('/order_bill', async (req, res) => {
	res.render('product_manage/order_bill');
});

// 자재관리
//자재관리 >> 자재관리
app.get('/stock_manage', async (req, res) => {
	let row = await asyncQuery(`
								SELECT a.no,
									   a.name,
									   a.sortation,
									   a.material,
									   a.thickness,
									   a.width,
									   a.height,
									   a.diameter,
									   a.length,
									   a.qty,
									   DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as UpdateTime,
									   a.etc 									
								FROM mes_win.material a 
								ORDER BY no DESC
								`);
	res.render('material_manage/stock_manage', { row: row });
});

//자재 정보 >> 자재 정보 >> 등록
app.post('/stock_manage_add', async (req, res) => {
	let result = await asyncQuery(`
								select * from mes_win.material a where a.name = '${req.body.name}'
								`);
	if (result != 0) {
		res.send('n');
	} else {
		let add = await asyncQuery(
			`INSERT INTO mes_win.material (name,sortation,material,thickness,width,height,diameter,length,etc,qty)
									VALUES (?,?,?,?,?,?,?,?,?,0)`,
			[
				req.body.name,
				req.body.sortation,
				req.body.material,
				req.body.thickness,
				req.body.width,
				req.body.height,
				req.body.diameter,
				req.body.length,
				req.body.etc,
			]
		);
		res.send('y');
	}
});

//자재 정보 >> 자재 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/stock_manage_update_select', async (req, res) => {
	let row = await asyncQuery(`SELECT * from DG.stock_manage where no = ${req.body.no}`);
	res.send(row);
});

//자재 정보 >> 자재 정보 >> 수정
app.post('/stock_manage_update', async (req, res) => {
	var client_name = req.body.client_name;
	var business_number = req.body.business_number;
	var ceo = req.body.ceo;
	var phone_number = req.body.phone_number;
	var address = req.body.address;
	if (client_name == '') {
		client_name = '';
	}
	if (business_number == '') {
		business_number = '';
	}
	if (ceo == '') {
		ceo = '';
	}
	if (phone_number == '') {
		phone_number = '';
	}
	if (address == '') {
		address = '';
	}
	let row = await asyncQuery(`UPDATE DG.stock_manage
								set client_name='${client_name}',
									business_number='${business_number}',
									ceo='${ceo}',
									phone_number='${phone_number}',
									address='${address}'
									where no = ${req.body.no}`);
	res.send('y');
});

//자재 정보 >> 자재 정보 >> 체크박스 삭제
app.post('/stock_manage_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		if (!(await asyncQuery(`DELETE FROM DG.stock_manage WHERE no IN (${sParm})`)))
			return res.send(`<script>alert('삭제 실패'); location='/stock_manage';</script>`);
	}
	res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/stock_manage';</script>`);
});

//자재 관리 >> 입/출고 관리 조회
app.get('/inandout_manage', async (req, res) => {
	let row = await asyncQuery(`
								SELECT no,
									   name,
									   sortation,
									   material,
									   thickness,
									   width,
									   height,
									   diameter,
									   length,
									   qty,
									   DATE_FORMAT(UpdateTime, "%Y-%m-%d") as UpdateTime,
									   etc
								FROM mes_win.material
								ORDER BY no DESC
								`);

	let row2 = await asyncQuery(`
								SELECT b.no,
									   b.name,
									   b.qty ,
									   b.state ,
									   b.coment ,
									   DATE_FORMAT(b.UpdateTime, "%Y-%m-%d") as updateTime									   
								FROM mes_win.material_history b
								where b.state=1
								ORDER BY b.no DESC
								`);
	let row3 = await asyncQuery(`
								with tempA as(
									SELECT a.name, SUM(a.qty) as sum 
									FROM mes_win.material_history a
									where a.state =1								
									group by a.name
								),tempB as(
									SELECT a.name as name2, SUM(a.qty) as sum2
									FROM mes_win.material_history a
									where a.state =2								
									group by a.name
								)
								select a.name, a.sum as sum 
								from tempA a
								left join tempB b
  								on a.name = b.name2
								where sum - ifnull(sum2,0) > 0
								`);
	let row4 = await asyncQuery(`
								SELECT 
									a.no ,
									a.name ,
									a.qty ,
									a.coment ,
									DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as updateTime									    
								FROM mes_win.material_history a
								where a.state = 2
								`);
	res.render('material_manage/inandout_manage', { row: row, row2: row2, row3: row3, row4: row4 });
});
//자재 관리 >> 입/출고 관리 등록 자재명 조회
app.post('/inandout_manage_name', async (req, res) => {
	let rows = await asyncQuery(`
								SELECT * FROM mes_win.material WHERE name = '${req.body.name}'
								`);
	res.send(rows);
});
//자재 관리 >> 입/출고 관리 등록 자재명 조회
app.post('/inandout_manage_name2', async (req, res) => {
	let rows = await asyncQuery(`
								SELECT a.name , SUM(a.qty), b.* FROM mes_win.material_history a
								left join material b 
								on a.name = b.name 
								where a.name = '${req.body.name}'
								group by a.name 								
								`);
	res.send(rows);
});

//자재 관리 >> 입/출고 관리 입고등록
app.post('/inandout_manage_add', async (req, res) => {
	let add = await asyncQuery(
		`INSERT INTO mes_win.material_history (name,qty,coment,state)
								VALUES (?,?,?,?)`,
		[req.body.name, req.body.in_qty, req.body.coment, req.body.state]
	);

	let add2 = await asyncQuery(`
								update
										mes_win.material a
								set a.qty=${req.body.sum}									
								where a.name = '${req.body.name}'
							`);
	res.send('y');
});

//자재 관리 >> 입/출고 관리 출고등록
app.post('/inandout_manage_add2', async (req, res) => {
	let add = await asyncQuery(
		`INSERT INTO mes_win.material_history (name,qty,coment,state)
								VALUES (?,?,?,?)`,
		[req.body.name, req.body.out_qty, req.body.coment, req.body.state]
	);

	let add2 = await asyncQuery(`
								update
										mes_win.material a
								set a.qty=${req.body.sum}									
								where a.name = '${req.body.name}'
							`);
	res.send('y');
});

//자재 관리 >> 입고 관리 삭제
app.post('/inandout_manage_delete', async (req, res) => {
	let result = '';

	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		result = await asyncQuery(`
									update mes_win.material s
									join(
										with tempA as(
										SELECT 
											a.no,
											a.name ,								
											sum(a.qty) as result
										FROM mes_win.material_history a							
										where a.no in (${sParm})
										and a.state=1
										group by a.name			
										)
										select 
											a.name ,									
											(b.qty - a.result) as sum
										FROM tempA a
										left join mes_win.material b
										on a.name = b.name		
									) k on s.name = k.name
									set s.qty = k.sum
								`);

		if (!(await asyncQuery(`DELETE FROM mes_win.material_history WHERE no IN (${sParm})`))) {
			return res.send(`<script>alert('삭제 실패'); location='/inandout_manage';</script>`);
		} else {
			res.send(
				`<script>alert('삭제가 완료 되었습니다.'); location='/inandout_manage';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/inandout_manage';</script>`);
});

//자재 관리 >> 출고 관리 삭제
app.post('/inandout_manage_delete2', async (req, res) => {
	let result = '';

	if (req.body.chList2) {
		const sParm =
			typeof req.body.chList2 == 'string' ? req.body.chList2 : req.body.chList2.join(',');

		result = await asyncQuery(`
									update mes_win.material s
									join(
										with tempA as(
										SELECT 
											a.no,
											a.name ,								
											sum(a.qty) as result
										FROM mes_win.material_history a							
										where a.no in (${sParm})
										and a.state=2
										group by a.name			
										)
										select 
											a.name ,									
											(b.qty + a.result) as sum
										FROM tempA a
										left join mes_win.material b
										on a.name = b.name		
									) k on s.name = k.name
									set s.qty = k.sum
								`);

		if (!(await asyncQuery(`DELETE FROM mes_win.material_history WHERE no IN (${sParm})`))) {
			return res.send(`<script>alert('삭제 실패'); location='/inandout_manage';</script>`);
		} else {
			res.send(
				`<script>alert('삭제가 완료 되었습니다.'); location='/inandout_manage';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/inandout_manage';</script>`);
});

//자재 관리 >> 품목별자재현황
app.get('/stock_con', async (req, res) => {
	let row = await asyncQuery(`
								SELECT no,
									   name,
									   sortation,
									   material,
									   thickness,
									   width,
									   height,
									   diameter,
									   length,
									   qty,
									   DATE_FORMAT(UpdateTime, "%Y-%m-%d") as UpdateTime,
									   etc
								FROM mes_win.material
								ORDER BY no DESC`);
	res.render('material_manage/stock_con', { row: row });
});
//자재 관리 >> 품목별자재현황 자재명으로 조회
app.get('/stock_con_detail/:name', async (req, res) => {
	let row = await asyncQuery(`
								SELECT no,
									   name,
									   sortation,
									   material,
									   thickness,
									   width,
									   height,
									   diameter,
									   length,
									   qty,
									   DATE_FORMAT(UpdateTime, "%Y-%m-%d") as UpdateTime,
									   etc
								FROM mes_win.material
								ORDER BY no DESC
								`);

	let rows = await asyncQuery(` 
								SELECT 
									a.name ,
									a.qty ,
									a.state ,
									a.coment ,
									DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as UpdateTime
								FROM mes_win.material_history a
								WHERE a.name = '${req.params.name}'
								order by no desc 	
 								`);

	let row2 = `${req.params.name}`;
	res.render('material_manage/stock_con_detail', { row: row, rows: rows, row2: row2 });
});
//자재 관리 >> 품목별자재현황 row 클릭 시 조회
app.get('/stock_con_detail_inout/:name', async (req, res) => {
	let row = await asyncQuery(`
								SELECT no,
									   name,
									   sortation,
									   material,
									   thickness,
									   width,
									   height,
									   diameter,
									   length,
									   qty,
									   DATE_FORMAT(UpdateTime, "%Y-%m-%d") as UpdateTime,
									   etc
								FROM mes_win.material
								ORDER BY no DESC`);

	let rows = await asyncQuery(`
								SELECT 
								a.no,
								a.name,
								a.sortation ,
								a.material ,
								a.thickness ,
								a.width ,
								a.height ,
								a.diameter ,
								a.length ,
								a.qty ,
								a.etc,
								DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as UpdateTime
								FROM mes_win.material a 
 								WHERE a.name = '${req.params.name}'
 								`);

	let row2 = await asyncQuery(`
								SELECT 
									a.name ,
									a.qty ,
									a.state ,
									a.coment ,
									DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as UpdateTime
								FROM mes_win.material_history a
								WHERE a.name = '${req.params.name}'
								order by no desc 								
 								`);
	console.log(row2);
	res.render('material_manage/stock_con_detail_inout', { row: row, rows: rows, row2: row2 });
});

// app.post("/stock_con_name", async (req, res) => {
// 	let rows = await asyncQuery(`
// 								SELECT * FROM mes_win.material WHERE name = '${req.body.name}'
// 								`);
// 	res.render("material_manage/stock_con",{rows:rows});
// });

//생산 관리 >> 수주별
app.get('/by_order', async (req, res) => {
	let row = await asyncQuery(`
								SELECT 
								    a.order_key ,
									a.order_place ,
									a.order_manager ,
									a.order_time ,
									a.shipment_time ,
									a.process ,
									a.order_content 
								FROM mes_win.process a 
								`);
	res.render('manufact_manage/by_order', { row: row });
});

//자재 관리 >> 품목별자재현황 자재명으로 조회
app.get('/by_order_detail/:order_key', async (req, res) => {
	let row = await asyncQuery(`
								SELECT 
								    a.order_key ,
									a.order_place ,
									a.order_manager ,
									a.order_time ,
									a.shipment_time ,
									a.process ,
									a.order_content 
								FROM mes_win.process a 
								`);

	let rows = await asyncQuery(`
								select 
									a.order_key ,
									a.item ,
									a.qty ,
									b.work_qty as wo_qty,
									c.work_qty as sh_qty,
									b.work_qty - ifnull(c.work_qty,0) as st_qty,
									DATE_FORMAT(b.end_time, "%Y-%m-%d") as wo_date ,
									DATE_FORMAT(c.updatetime, "%Y-%m-%d") as sh_date								
								from mes_win.process a
								left join mes_win.work_history b 
									on a.order_key = b.order_key 
								left join mes_win.shipping_history c
									on a.order_key = c.order_key 
								where a.order_key = '${req.params.order_key}'
 								`);
	console.log(rows);
	res.render('manufact_manage/by_order_detail', { row: row, rows: rows });
});

//생산 관리 >> 수주별
app.get('/by_item', async (req, res) => {
	let row = await asyncQuery(`
								SELECT 					
									a.item 
								FROM mes_win.process a 
								group by a.item
								`);
	res.render('manufact_manage/by_item', { row: row });
});

//자재 관리 >> 품목별자재현황 자재명으로 조회
app.get('/by_item_detail/:item', async (req, res) => {
	let row = await asyncQuery(`
								SELECT 					
									a.item 
								FROM mes_win.process a 
								group by a.item
								`);

	let rows = await asyncQuery(`
								select 
									a.order_key ,
									a.item ,
									a.qty ,
									b.work_qty as wo_qty,
									c.work_qty as sh_qty,
									b.work_qty - ifnull(c.work_qty,0) as st_qty,
									DATE_FORMAT(b.end_time, "%Y-%m-%d") as wo_date ,
									DATE_FORMAT(c.updatetime, "%Y-%m-%d") as sh_date								
								from mes_win.process a
								left join mes_win.work_history b 
									on a.order_key = b.order_key 
								left join mes_win.shipping_history c
									on a.order_key = c.order_key 
								where a.item = '${req.params.item}'
 								`);
	console.log(rows);
	res.render('manufact_manage/by_item_detail', { row: row, rows: rows });
});

//생산 관리 >> 공정별
app.get('/by_facility', async (req, res) => {
	let row = await asyncQuery(`
		   							   SELECT 
										   no,
										   order_key,
										   item,
										   order_place,
										   order_manager,
										   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
										   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
										   process,
										   order_content,
										   qty
									   FROM mes_win.process ORDER BY (no) DESC
									   `);
	let process = await asyncQuery(`SELECT * from mes_win.standard_process`);
	let out_process = '';
	res.render('manufact_manage/by_facility', {
		row: row,
		process: process,
		out_process: out_process,
	});
});
//생산 관리 >> 공정별 버튼조회 >> 프로세스 정렬을 위한 조회
app.post('/by_facility_sort', async (req, res) => {
	let process = await asyncQuery(`
	   								SELECT * from mes_win.standard_process
									`);
	res.send(process);
});

//생산 관리 >> 공정별 버튼조회
app.post('/by_facility_select', async (req, res) => {
	console.log('${req.body.s_process}:' + req.body.s_process);
	var p_process = req.body.s_process;
	var ss = p_process.split(',');

	console.log('p_process:' + p_process);
	let sql = 'SELECT a.no,a.order_key,a.item,a.process FROM mes_win.process a where 1=1 ';
	let like_add = '';

	for (var i = 0; i < ss.length; i++) {
		like_add += "and a.process like '%" + ss[i] + "%'";
	}
	let sql_like_add = sql + like_add;
	console.log('sql_like_add:  ' + sql_like_add);

	let row = await asyncQuery(sql_like_add);
	let process = await asyncQuery(`
	   								SELECT * from mes_win.standard_process
									`);
	res.render('manufact_manage/by_facility', {
		row: row,
		process: process,
		out_process: p_process,
	});
});
//생산 관리 >> 작업지시서
app.get('/order_document', async (req, res) => {
	let customer_info = await asyncQuery(`SELECT * from mes_win.customer_info`);
	let process = await asyncQuery(`SELECT * from mes_win.standard_process`);
	let rows = await asyncQuery(`
								SELECT 
								   no,
								   order_key,
								   item,									   
								   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
								   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
								   process,
								   order_content,
								   qty,									   
								   state,
								   work_manager,
								   workrequest_time ,
								   work_content ,
								   CHAR_LENGTH(process) as process_length
								FROM mes_win.process 								
								where state in(1,2)
							`);
	let order_num = await asyncQuery(`
								SELECT a.state,
										a.order_key 
								FROM 
								mes_win.process a 
								where state = '0'							
									`);
	// let customer_info = await asyncQuery(`SELECT * from mes_win.customer_info`);
	// let order_num = await asyncQuery(`SELECT a.*, b.state
	// 								  FROM mes_win.order_add as a
	// 								  LEFT JOIN mes_win.order_document as b
	// 								  ON a.order_key = b.order_key
	// 							      WHERE b.state is null`)

	// let process = await asyncQuery(`SELECT * from mes_win.standard_process`);
	// let rows = await asyncQuery(`SELECT no,
	// 								   order_key,
	// 								   item,
	// 								   manager,
	// 								   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
	// 								   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
	// 								   process,
	// 								   order_content,
	// 								   qty,
	// 								   order_qty,
	// 								   state,
	// 								   order_document_content
	// 								   FROM mes_win.process ORDER BY (no) DESC`)

	res.render('manufact_manage/order_document', {
		customer_info: customer_info,
		process: process,
		rows: rows,
		order_num: order_num,
	});
});

//기준 정보 >> 작업 지시서 >> 등록
app.post('/order_document_add', async (req, res) => {
	console.log(req.body);
	var request_time = req.body.request_time;
	var shipment_time = req.body.shipment_time;
	if (req.body.manager == '') {
		res.send('n');
	}
	// else if(request_time > shipment_time)
	// 	{
	// 		res.send('x')
	//  	}
	else {
		let add = await asyncQuery(`
										update
												mes_win.process a
										set a.work_manager='${req.body.manager}'
											, a.workrequest_time='${req.body.request_time}'			
											, a.work_content='${req.body.order_command_content}'
											, a.state = '1'
										where a.order_key = '${req.body.order_key}'
									`);
		res.send('y');
	}
});

//기준 정보 >> 작업 지시서>> 체크박스 삭제
app.post('/order_document_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		if (!(await asyncQuery(`DELETE FROM mes_win.process WHERE no IN (${sParm})`)))
			return res.send(`<script>alert('삭제 실패'); location='/order_document';</script>`);
	}
	res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/order_document';</script>`);
});

//작업 요청 관련 셀렉트 박스 바꾸었을때 셀렉트 박스 값 변화 시키는 post
app.post('/order_document_select_num', async (req, res) => {
	var arr_process = [];
	let customer_info = await asyncQuery(`
									   SELECT no,
									   order_key,
									   item,
									   order_manager,
									   DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
									   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
									   process,
									   order_content,
									   qty
									   from mes_win.process where order_key = '${req.body.index}'`);
	res.send(customer_info);
});
//작업 요청 작업 번호 바꿀시 process 변경 하는 POST
app.post('/order_document_pro_select', async (req, res) => {
	let row = await asyncQuery(`SELECT * from mes_win.standard_process`);
	res.send(row);
});
// 작업지시서 작업요청 버튼 눌릴시 state 변경하는 버튼 POST
app.post('/order_document_requset', async (req, res) => {
	let row = await asyncQuery(`UPDATE mes_win.process SET state = 2 where no = ${req.body.no}`);

	let insert = await asyncQuery(`
					insert into mes_win.work_history(
						order_key,	
						work_key												
					)
					values ('${req.body.order_key}'															
							, '0'																			
							)
					`);

	console.log(insert.insertId);

	let key_value = 'WO' + insert.insertId;

	let row2 = await asyncQuery(`update mes_win.work_history
									set work_key = '${key_value}'										
									where order_key = '${req.body.order_key}'`);

	res.send(row);
});
// 작업지시서 요청취소 버튼 눌릴시 state 변경하는 버튼 POST
app.post('/order_document_requset_cancel', async (req, res) => {
	let row = await asyncQuery(`UPDATE mes_win.process SET state = 1 where no = ${req.body.no}`);
	res.send(row);
});

//생산 관리 >> 작업지시서
app.get('/order_document_history', async (req, res) => {
	let row = await asyncQuery(`
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,									   
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content ,
								   DATE_FORMAT(b.start_time , "%Y-%m-%d") as start_time	,
								   DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time	,
								   b.work_coment ,
								   b.work_qty 
								FROM mes_win.process a								
								left join mes_win.work_history b 
								on a.order_key = b.order_key 	
								where a.state NOT IN (0,1)
				`);
	res.render('manufact_manage/order_document_history', { row: row });
});

// 프로세스 > 생산현황 > 상세보기 버튼 클릭 시
app.post('/order_document_history_Fn_detailModal', async (req, res) => {
	let detail_row = await asyncQuery(`
											SELECT 
												a.no, 
												a.work_key ,
												a.order_key , 
												a.item , 
												a.qty , 
												a.order_qty ,
												a.start_time ,
												a.end_time, 
												b.order_content as order_content
											from DG.order_document_history a
											left join DG.order_document b 
											ON a.order_key = b.order_key 
											where a.order_key = '${req.body.order_key}'
								`);
	res.send(detail_row);
});

//현장 관리 >> 3.작업요청
app.get('/work_status', async (req, res) => {
	let rows = await asyncQuery(`
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,									   
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content ,
								   DATE_FORMAT(b.start_time , "%Y-%m-%d") as start_time	,
								   DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time ,
								   b.work_key 
								FROM mes_win.process a								
								left join mes_win.work_history b 
								on a.order_key = b.order_key 
								where a.state in(2,3,4)
								group by a.order_key
								`);

	// let customer_info = await asyncQuery(`SELECT * from DG.customer_info`);
	// let process = await asyncQuery(`SELECT * from DG.standard_process`);

	res.render('field_manage/work_status', { rows: rows });
});

// 3.작업요청 > stop 버튼 클릭 시
app.post('/work_status_stop_select', async (req, res) => {
	console.log('작업종료' + req.body.order_key);
	let stop_row = await asyncQuery(`
										SELECT a.no,
										   a.order_key,
										   a.item,									   
										   a.work_content ,
										   a.qty															    
										FROM mes_win.process a											
										where a.order_key = '${req.body.order_key}'										
										`);
	res.send(stop_row);
});

//현장관리 >> 작업현황
app.post('/work_status_button', async (req, res) => {
	let button = req.body.button;

	if (button == 'run') {
		console.log('run 쿼리 실행' + req.body.order_key);
		//  let insert = await asyncQuery(`
		//  					insert into mes_win.work_history(
		// 						order_key,
		// 						work_key,
		// 						start_time
		// 					)
		//  					values ('${req.body.order_key}'
		// 							, '0'
		// 							, sysdate()
		// 							)
		//  					`);
		// console.log(insert.insertId)

		// let key_value = "WO"+ insert.insertId;

		let row = await asyncQuery(`update mes_win.process
									set state = 3
									where order_key = '${req.body.order_key}'`);
		let row2 = await asyncQuery(`update mes_win.work_history
									set start_time = sysdate()
									where order_key = '${req.body.order_key}'`);
		res.send('ok');
	} else if (button == 'stop') {
		console.log('작업종료 stop 쿼리 실행' + req.body.order_key + ' / ' + req.body.input_qty);

		let row = await asyncQuery(`update mes_win.process
									set state = 4
									where order_key = '${req.body.order_key}'`);
		let row2 = await asyncQuery(`update mes_win.work_history
									set work_qty = '${req.body.input_qty}', work_coment = '${req.body.work_coment}',
										end_time = now()
									where order_key = '${req.body.order_key}'`);
		res.send('ok');
	} else if (button == 'cancel') {
		console.log('작업취소 쿼리 실행');
		let row = await asyncQuery(
			`update mes_win.process set state = 1 where no = ${req.body.no}`
		);
		let row2 = await asyncQuery(
			`DELETE FROM mes_win.work_history WHERE order_key IN ('${req.body.order_key}')`
		);
		res.send('y');
	}
});
//현장관리 >> 작업현황 작업시작 클릭
app.get('/work_status_detail/:order_key', async (req, res) => {
	let rows = await asyncQuery(`
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,									   
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content ,
								   DATE_FORMAT(b.start_time , "%Y-%m-%d") as start_time	,
								   DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time ,
								   b.work_key 
								FROM mes_win.process a								
								left join mes_win.work_history b 
								on a.order_key = b.order_key 
								where a.state in(2,3,4)
								group by a.order_key
								`);
	let rows2 = await asyncQuery(` 
							SELECT 
								a.order_key ,
								a.item ,
								DATE_FORMAT(a.order_time, "%Y-%m-%d") as order_time,								
								b.work_qty ,
								DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time								
							from mes_win.process a 
							left join mes_win.work_history b 
								on a.order_key = b.order_key 
							where a.order_key = '${req.params.order_key}'
							order by a.no desc
 								`);
	let rows3 = await asyncQuery(`
											SELECT 
												no,
												process ,
												process_details ,
												manager ,
												etc ,
												updatetime 
											from mes_win.standard_process
											`);
	res.render('field_manage/work_status_detail', { rows: rows, rows2: rows2, rows3: rows3 });
});

// 3.작업현황 > 품질검사 번호 조회
app.post('/qu_status_button', async (req, res) => {
	let rows = await asyncQuery(`
										SELECT count(a.qu_key) as count
										from DG.defective_list a
										where SUBSTRING(qu_key,4,6) = '${req.body.select_qu_key}'
									`);
	res.send(rows);
});

//현장관리 >> 작업 이력
app.get('/work_history', async (req, res) => {
	let row1 = await asyncQuery(`
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,									   
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content ,
								   b.work_key ,
								   DATE_FORMAT(b.start_time , "%Y-%m-%d") as start_time	,
								   DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time	,
								   b.work_coment ,
								   b.work_qty 								   
								FROM mes_win.process a								
								left join mes_win.work_history b 
								on a.order_key = b.order_key 								
								where a.state IN (2)			
								`);
	let row2 = await asyncQuery(`
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,									   
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content ,
								   b.work_key ,
								   DATE_FORMAT(b.start_time , "%Y-%m-%d") as start_time	,
								   DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time	,
								   b.work_coment ,
								   b.work_qty 								   
								FROM mes_win.process a								
								left join mes_win.work_history b 
								on a.order_key = b.order_key 								
								where a.state IN (3)			
								`);
	let row3 = await asyncQuery(`
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,									   
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content ,
								   b.work_key ,
								   DATE_FORMAT(b.start_time , "%Y-%m-%d") as start_time	,
								   DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time	,
								   b.work_coment ,
								   b.work_qty 								   
								FROM mes_win.process a								
								left join mes_win.work_history b 
								on a.order_key = b.order_key 								
								where a.state not IN (0,1,2,3)			
								`);	
	res.render('field_manage/work_history', { row1 : row1, row2 : row2, row3 : row3});
});

//설비관리 >> 상태 모니터링
app.get('/status_monitoring', async (req, res) => {
	// let row = await asyncQuery(`SELECT order_key,
	// 							       DATE_FORMAT(order_time, "%Y-%m-%d") as order_time,
	// 								   DATE_FORMAT(shipment_time, "%Y-%m-%d") as shipment_time,
	// 								   qty,
	// 								   order_qty,
	// 								   state
	// 							FROM DG.order_document`);
	res.render('facility_manage/status_monitoring');
});

app.get('/machine/state', async (req, res) => {
	// let M_machine_data = await asyncQuery(`select id,state,updatetime from DG.machine_info
	// 									   WHERE no IN (SELECT MAX(no) FROM DG.machine_info GROUP BY id) ORDER BY id`);
	// res.send({ M_machine_data: M_machine_data });
});

//설비관리 >> 상세 현황
app.get('/detail_con', async (req, res) => {
	res.render('facility_manage/detail_con');
});

//설비관리 >> 설비점검관리
app.get('/facility_inspect', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.idx ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time 												
								from mes_win.board a
								where a.idx = 2
								order by a.no desc
								`);
	res.render('facility_manage/facility_inspect', { row: row });
});

//설비관리 >> 설비점검관리 검색
app.post('/facility_inspect_search', async (req, res) => {
	let row = '';
	const keyword = `%${req.body.s_keyword}%`;
	console.log(keyword);
	if (req.body.s_keyword) {
		if (req.body.s_where) {
			row = await asyncQuery(`
									SELECT * FROM mes_win.board a
									WHERE ${req.body.s_where} LIKE '${keyword}'		
									and a.idx = 2
									`);
		} else {
			row = await asyncQuery(`
									SELECT * FROM mes_win.board a
									WHERE (a.subject LIKE '${keyword}' OR a.content LIKE '${keyword}')
									and a.idx = 2
									`);
		}
	} else {
		row = await asyncQuery(`
									SELECT * FROM mes_win.board a
									where a.idx = 2
									`);
	}
	res.render('facility_manage/facility_inspect', { row: row });
});

//설비관리 >> 설비점검 등록조회
app.get('/facility_inspect_add', async (req, res) => {
	res.render('facility_manage/facility_inspect_add');
});
//설비관리 >> 설비점검 등록
app.post('/facility_inspect_add', async (req, res) => {
	let add = await asyncQuery(
		`
							INSERT INTO mes_win.board (								
								subject,
								content,
								submit_time,
								idx
							)
							VALUES (?,?,sysdate(),2)`,
		[req.body.subject, req.body.contents]
	);
	res.send('ok');
});

//설비관리 >> 설비점검 상세보기
app.get('/facility_inspect_detail/:idx', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.no = ${req.params.idx}
								and a.idx =2
								`);
	res.render('facility_manage/facility_inspect_detail', { row: row });
});
//설비관리 >> 설비점검 수정조회
app.get('/facility_inspect_update/:idx', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.no = ${req.params.idx}
								`);
	res.render('facility_manage/facility_inspect_update', { row: row });
});

//설비점검관리 >> 설비점검 수정
app.post('/facility_inspect_update_add', async (req, res) => {
	console.log('수정버튼');
	let add = await asyncQuery(`
								UPDATE mes_win.board a
								set a.subject='${req.body.board_subject}',
									a.content='${req.body.board_content}'									
									where a.no = ${req.body.board_no}
									and a.idx = 2
							`);
	res.send('ok');
});

//설비점검관리 >> 설비점검관리 삭제
app.post('/facility_inspect_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		let rows = await asyncQuery(`
								SELECT  
									no	
								FROM mes_win.board
								where no in(${sParm})						
								and idx = 2
		`);
		if (rows != '') {
			if (
				!(await asyncQuery(`DELETE FROM mes_win.board WHERE no IN (${sParm}) and idx = 2`))
			) {
				return res.send(
					`<script>alert('삭제 실패'); location='/facility_inspect';</script>`
				);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/facility_inspect';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/facility_inspect';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/facility_inspect';</script>`);
});

//설비관리 >> 설비보전현황
app.get('/facility_con', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.idx ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time 												
								from mes_win.board a
								where a.idx = 3
								order by a.no desc
								`);
	res.render('facility_manage/facility_con', { row: row });
});

//설비관리 >> 설비보전현황 검색
app.post('/facility_con_search', async (req, res) => {
	let row = '';
	const keyword = `%${req.body.s_keyword}%`;
	console.log('setup : ' + req.body.setup);
	console.log('s_where : ' + req.body.s_where);

	if (req.body.s_keyword) {
		if (req.body.s_where) {
			row = await asyncQuery(`
									SELECT * FROM mes_win.board a
									WHERE ${req.body.s_where} LIKE '${keyword}'		
									and a.idx = 3
									`);
		} else {
			row = await asyncQuery(`
									SELECT * FROM mes_win.board a
									WHERE (a.subject LIKE '${keyword}' OR a.content LIKE '${keyword}')
									and a.idx = 3
									`);
		}
	} else {
		row = await asyncQuery(`
									SELECT * FROM mes_win.board a
									where a.idx = 3
									`);
	}
	res.render('facility_manage/facility_con', { row: row });
});

//설비관리 >> 설비보전현황 상세보기
app.get('/facility_con_detail/:idx', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.no = ${req.params.idx}
								and a.idx =3
								`);
	res.render('facility_manage/facility_con_detail', { row: row });
});

//설비관리 >> 설비보전현황 등록
app.get('/facility_con_add', async (req, res) => {
	res.render('facility_manage/facility_con_add');
});

//설비관리 >> 설비보전현황 등록하기
app.post('/facility_con_add', async (req, res) => {
	let add = await asyncQuery(
		`
							INSERT INTO mes_win.board (								
								subject,
								content,
								submit_time,
								idx
							)
							VALUES (?,?,sysdate(),3)`,
		[req.body.subject, req.body.contents]
	);
	res.send('ok');
});

//설비관리 >> 설비보전현황 수정조회
app.get('/facility_con_update/:idx', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.no = ${req.params.idx}
								and a.idx=3
								`);
	res.render('facility_manage/facility_con_update', { row: row });
});

//설비관리 >> 설비점검 수정
app.post('/facility_con_update_add', async (req, res) => {
	console.log('수정버튼');
	let add = await asyncQuery(`
								UPDATE mes_win.board a
								set a.subject='${req.body.board_subject}',
									a.content='${req.body.board_content}'									
									where a.no = ${req.body.board_no}
									and a.idx = 3
							`);
	res.send('ok');
});

//설비관리 >> 설비보전현황 삭제
app.post('/facility_con_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		let rows = await asyncQuery(`
								SELECT  
									no	
								FROM mes_win.board
								where no in(${sParm})						
								and idx = 3
		`);
		if (rows != '') {
			if (
				!(await asyncQuery(`DELETE FROM mes_win.board WHERE no IN (${sParm}) and idx = 3`))
			) {
				return res.send(`<script>alert('삭제 실패'); location='/facility_con';</script>`);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/facility_con';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/facility_con';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/facility_con';</script>`);
});

//프로세스순서 > 불량리스트
app.get('/defective_list', async (req, res) => {
	let rows = await asyncQuery(`
							with tempA as(
								SELECT 
									a.*									
								FROM mes_win.process a	
								where a.state = '4'
							) 
							,tempB as(
								SELECT
									a.order_key,
									sum(a.qty)	as o_qty								
								from mes_win.defective_history as a
								where a.quality in('o')
								group by a.order_key
							) 
							,tempC as(
								SELECT 	
									a.order_key,
									sum(a.qty)	as x_qty								
								from mes_win.defective_history as a
								where a.quality in('x')
								group by a.order_key
							)
							select a.* ,									
									b.o_qty,
									c.x_qty,
									a.qty - ifnull(b.o_qty,0) - ifnull(c.x_qty,0) as remain_qty
								from tempA a
								left join tempB b on a.order_key = b.order_key
								left join tempC c on a.order_key = c.order_key
								order by no desc
							`);

	/*
	let rows = await asyncQuery(`
								SELECT
									a.order_key,
									a.qty ,
									a.item,
									b.quality ,
									sum(b.qty) as remain_qty
								FROM mes_win.process a	
								left join (SELECT
												b.order_key ,
												b.quality,
												b.qty
											FROM mes_win.defective_history as b
											where b.quality not in ('r')
								) as b
								on a.order_key = b.order_key
								group by a.order_key
							`)
		*/
	let row2 = await asyncQuery(`
							with tempA as(
							select 
								a.order_key,								
								a.quality ,
								a.work_key,
								a.comment ,
								a.qty,
								b.item,
								b.qty as order_qty								 
							from mes_win.defective_history a
							inner join mes_win.process b
							on a.order_key = b.order_key 
							HAVING a.quality in('x')
							)
							, tempB as(
							select a.*, 
									SUM(a.qty) as x_qty									
							from tempA as a									
							group by a.order_key
							)
							, tempC as(
							select 
								a.order_key,
								a.qty,
								a.quality ,
								a.work_key,
								a.comment ,
								b.item								
							from mes_win.defective_history a
							inner join mes_win.process b
							on a.order_key = b.order_key 
							HAVING a.quality in('r')
							)
							, tempD as(
							select a.order_key, 
									SUM(a.qty) as r_qty,									
									a.item
							from tempC as a
							group by a.order_key
							)
							, tempE as(
							select 
								a.order_key,
								a.qty,
								a.quality ,
								a.work_key,
								a.comment ,
								b.item								
							from mes_win.defective_history a
							inner join mes_win.process b
							on a.order_key = b.order_key 
							HAVING a.quality in('o')
							)
							, tempF as(
							select a.order_key, 
									SUM(a.qty) as o_qty,									
									a.item
							from tempE as a
							group by a.order_key
							)
							, tempG as(
							select
								b.*,								
								ifnull(d.r_qty,0) as r_qty,
								ifnull(f.o_qty,0) as o_qty,
								b.x_qty - ifnull(d.r_qty,0) as remain_qty
							from tempB as b		
							left join tempD d on b.order_key = d.order_key		
							left join tempF f on b.order_key = f.order_key 							
							)select 
							*
							from tempG g
							where not g.remain_qty <= 0
							order by order_key desc
							`);
	console.log(row2);
	res.render('quality_manage/defective_list', { rows: rows, row2: row2 });
});

//품질검사 > 1.품질검사 > 작업시작(시작)
app.post('/check_select_button', async (req, res) => {
	let row = await asyncQuery(`
							with tempA as(
								SELECT a.no,
								   a.order_key,
								   a.item,									   
								   DATE_FORMAT(a.workrequest_time , "%Y-%m-%d") as request_time,
								   a.process,
								   a.order_content,
								   a.qty,  
								   a.state,
								   a.work_manager,
								   a.workrequest_time ,
								   a.work_content 								   
								FROM mes_win.process a								
								where a.state in(4)	
							) , tempB as(
								select 
								SUM(a.qty) as check_qty
								, a.order_key as check_key
								, a.quality as check_state
								from mes_win.defective_history a
								where a.quality in('o','x','r')
								group by a.order_key 
							) select * from tempA a
							left join tempB b
							on a.order_key = b.check_key
							HAVING order_key = '${req.body.order_key}'
						`);

	let row2 = await asyncQuery(`
							select 
							NO as no
							from mes_win.defective_history a
							ORDER BY no DESC LIMIT 1			
							`);

	let row3 = await asyncQuery(`
						SELECT 
						SUM(a.qty) as his_sumqty
						FROM mes_win.defective_history a
						where a.quality in ('o','r')
						and a.order_key = '${req.body.order_key}'
						`);

	res.send({ row: row, row2: row2, row3: row3 });
});
// app.post("/check_status_button", async (req, res) => {
// 	let button = req.body.button;

// 	if(button=="check_count"){
// 		console.log("check_count 쿼리 실행" + req.body.no + " / " + req.body.order_key);
// 		let QU_KEY = "QU-" +  req.body.order_key.substring(3);
// 		console.log(QU_KEY);
// 		let job_key = req.body.order_key + "-" + req.body.no;
// 		let rows = await asyncQuery(`
// 									SELECT count(a.qu_key) as count
// 									from DG.defective_history as a
// 									where a.qu_key =  '${QU_KEY}'
// 									`);
// 		res.send(rows);
// 	}else if(button=="check_run"){
// 		console.log("검사시작 쿼리 실행:" + req.body.order_key + "   /   " + req.body.create_check_key);
// 		var create_check_key = req.body.create_check_key;

// 		// 검사 작업시작일자 넣기 위함
// 		let start_time_s = await asyncQuery(`select state from DG.order_document where order_key = '${req.body.order_key}'`);
// 		if(start_time_s[0].state == 5){
// 			let start_time_update = await asyncQuery(`update DG.defective_list
// 														set check_start_time = now() ,
// 															state = 6
// 														where qu_key = '${req.body.create_qu_key}'`)
// 		}

// 		 let insert = await asyncQuery(`
// 		 					insert into DG.defective_list(
// 																qu_key,
// 																work_qty
// 																)
// 		 					values (
// 									'${req.body.create_qu_key}'	,
// 									0
// 									)
// 		 					`);
// 		 let insert2 = await asyncQuery(`
// 		 					insert into DG.defective_history(
// 																qu_key
// 																, work_key
// 																, check_start_time
// 																)
// 		 					values ('${req.body.create_qu_key}'
// 									, '${req.body.create_work_key}'
// 									, sysdate()
// 									)
// 		 					`);
// 		res.send(row);

// 	} else if(button=="stop"){
// 		console.log("작업종료 쿼리 실행" + req.body.check_key + " / " + req.body.item + " / " + req.body.input_qty);
// 		var check_key = req.body.check_key;
// 		var item = req.body.item;
// 		var defective_content = req.body.defective_content;

// 		let row = await asyncQuery(`update DG.order_document
// 									set state = ${req.body.state_qty}
// 									, check_qty=${req.body.check_qty}
// 									, ok_qty=${req.body.check_ok_qty}
// 									, def_qty=${req.body.check_def_qty}
// 									where order_key = '${req.body.order_key}'`);
// 		 let add = await asyncQuery(`
// 										update
// 												DG.defective_history A
// 										set A.check_qty=${req.body.input_qty}
// 											, A.check_end_time=sysdate()
// 											, A.item='${item}'
// 											, A.ok_qty=${req.body.ok_qty}
// 											, A.def_qty=${req.body.def_qty}
// 											, A.defective_content='${defective_content}'
// 										where A.check_key = '${check_key}'
// 		 							`);
// 		let addwork = await asyncQuery(`select qty, order_qty from DG.order_document `);

// 		// 작업종료일자 넣기 위함
// 		let endtime_s = await asyncQuery(`select state from DG.order_document where order_key = '${req.body.order_key}'`);
// 		if(endtime_s[0].state == 8){
// 			let endtime_update = await asyncQuery(`update DG.order_document set check_end_time = now() where order_key = '${req.body.order_key}'`)
// 		}

// 		res.send(addwork);
// 	}else if(button=="cancel"){
// 		console.log("작업취소 쿼리 실행");
// 		let row = await asyncQuery(`update DG.order_document set state = 1 where no = ${req.body.no}`);
// 		res.send('y');
// 	}

// });
//품질검사 > 1.품질검사 > 작업시작(끝)

// 품질검사 > 1.품질검사 > 작업종료 버튼 시 조회(시작)
app.post('/check_status_stop_select', async (req, res) => {
	let stop_row = await asyncQuery(
		`SELECT * from DG.order_document where order_key = '${req.body.order_key}'`
	);
	let stop_row2 = await asyncQuery(
		`select * from DG.defective_history odh where order_key  = '${req.body.order_key}' order by UpdateTime desc LIMIT 1`
	);

	let stop_row3 = await asyncQuery(`
											select b.order_key, count(b.check_key) as qu_count
											from DG.order_document a
											left join DG.defective_history b
											on a.order_key = b.order_key 
											where a.order_key = '${req.body.order_key}'
										`);

	res.send({ row1: stop_row, row2: stop_row2 });
});
// 품질검사 > 1.품질검사 > 작업종료 버튼 시 조회(시작)

//품질검사 > 2.불량확인 > 처리내용 입력 모달 > 저장 클릭 시(시작)
app.post('/check_def_status', async (req, res) => {
	console.log('불량확인 저장 쿼리 실행' + req.body.check_key + ' / ' + req.body.check_key);
	var order_key = req.body.order_key;
	var defective_content = req.body.defective_content;
	var check_key = req.body.check_key;

	let row = await asyncQuery(`update 
									DG.order_document 
									set state = ${req.body.state} 
									, ok_qty=${req.body.ok_qty} 
									, def_qty=${req.body.def_qty} 
									, defective_completed='${req.body.defective_content}' 
									where order_key = '${req.body.order_key}' 
								  `);

	let addwork = await asyncQuery(`select qty, order_qty from DG.order_document `);

	res.send(addwork);
});
//품질검사 > 2.불량확인 > 처리내용 입력 모달 > 저장 클릭 시(끝)

//신규 검사 등록에 데이터 매핑 POST
app.post('/defective_list_update_select', async (req, res) => {
	let row = await asyncQuery(`SELECT no, 
								   order_key, 
								   work_key, 
								   item, 
								   qty,
								   order_qty, 
								   date_format(order_time, '%Y-%m-%d') as order_time,
								   date_format(shipment_time, '%Y-%m-%d') as shipment_time,
								   date_format(start_time, '%Y-%m-%d') as start_time,
								   date_format(end_time, '%Y-%m-%d') as end_time
								   FROM DG.order_document_history WHERE no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 불량 리스트 >> 신규 검사 등록
app.post('/defective_list_update', async (req, res) => {
	let row = await asyncQuery(`
								UPDATE mes_win.process
								SET 	state = ${req.body.state}									
								WHERE order_key = '${req.body.order_key}' 
							  `);

	let rows = await asyncQuery(`
									INSERT INTO mes_win.defective_history
										 (order_key,
										  quality,
										  work_key,									  
										  qty,
										  comment
										  )
									 VALUES 
										('${req.body.order_key}',
										'${req.body.state_his}',
										'${req.body.work_key}',
										'${req.body.update_qty}',
										'${req.body.input_defective_content}'
										)
										`);

	// let rows_ = await asyncQuery(`UPDATE DG.defective_list SET state = ${state} WHERE work_key = '${work_key}' `)
	res.send('y');
});

// 품질검사 >> 불량조치등록
app.post('/Fn_def_run_button', async (req, res) => {
	let row = await asyncQuery(`
								select 
								a.order_key ,
								a.quality,
								sum(a.qty) as sumqty
								from mes_win.defective_history a
								where a.order_key = '23022410'
								and a.quality in ('x','r')
							`);
	res.send(row);
});

// 품질검사 >> 불량조치등록
app.post('/defective_search_no', async (req, res) => {
	let row = await asyncQuery(`
							select 
							NO as no
							from mes_win.defective_history a
							ORDER BY no DESC LIMIT 1
							`);
	res.send(row);
});

// 품질검사 >> 불량조치등록
app.post('/defective_list2_update', async (req, res) => {
	let rows = await asyncQuery(`
								INSERT INTO mes_win.defective_history
									 (order_key,
									  quality,
									  work_key,									  
									  qty,
									  comment
									  )
								 VALUES 
									('${req.body.order_key}',
									'${req.body.state_his}',
									'${req.body.work_key}',
						'${req.body.update_qty}',
									'${req.body.commnet}'
									)	
							`);
	let row2 = await asyncQuery(`
								UPDATE mes_win.process
								SET 	state = '${req.body.state}'										
								WHERE order_key = '${req.body.order_key}' 	
							`);

	res.send('y');
});

//불량 조치 등록에 데이터 매핑 POST
app.post('/defective_list_modify_select', async (req, res) => {
	console.log(req.body.no);
	let row = await asyncQuery(`SELECT no,
								   order_key, 
								   work_key, 
								   item, 
								   qty, 
								   order_qty, 
								   date_format(start_time, '%Y-%m-%d') as start_time,
								   date_format(end_time, '%Y-%m-%d') as end_time,
								   defective_content
								   FROM DG.defective_history WHERE work_key = '${req.body.no}'`);
	console.log(row);
	res.send(row);
});

//불량 조치 수정에 데이터 등록 POST
// app.post("/defective_list_modify", async (req, res) => {
// 	var defective_measure = req.body.defective_measure;
// 	var state = 7;
// 	var work_key = req.body.work_key;
// 	if(state==""){state=''}
// 	if(defective_measure==""){defective_measure=''}

// 	let row = await asyncQuery(`UPDATE DG.defective_history SET state = 7 , defective_status = 7 , defective_measure = '${defective_measure}'
// 								WHERE work_key = '${work_key}'`)
// 	let rows = await asyncQuery(`UPDATE DG.defective_list SET state = 7 , defective_status = 7
// 								 WHERE work_key = '${work_key}'`)
// 	res.send('y');
// });

// 6.품질검사현황
app.post('/defective_list_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		if (!(await asyncQuery(`DELETE FROM DG.defective_list WHERE no IN (${sParm})`)))
			return res.send(`<script>alert('삭제 실패'); location='/defective_list';</script>`);
	}
	res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/defective_list';</script>`);
});

//품질 관리 >> 불량수정
app.get('/defective_modify', async (req, res) => {
	res.render('quality_manage/defective_modify');
});

//품질검사현황 > 검사 상세보기
app.get('/defective_con', async (req, res) => {
	let row = await asyncQuery(`
								SELECT  
									a.order_key,
									a.quality,
									a.comment,
									DATE_FORMAT(a.updatetime , "%Y-%m-%d") as updatetime ,															
									a.qty,
									b.item 
									FROM mes_win.defective_history as a 
									inner join mes_win.process as b
									on a.order_key = b.order_key 
									order by a.no desc
								`);
	res.render('quality_manage/defective_con', { row: row });
});

// 6.품질검사현황 > 상세보기 등록 시작
app.post('/defective_con_Fn_checkdetail_submit', async (req, res) => {
	let detail_row = await asyncQuery(`
								UPDATE DG.defective_history a
								set a.defective_completed='${req.body.defective_completed}',
									a.state='7'
									where a.work_key = '${req.body.work_key}'
								`);
	res.send(detail_row);
});
// 6.품질검사현황 > 상세보기 등록 끝

//리포트 >> 기간별 가동율
app.get('/activation_period', async (req, res) => {
	res.render('report/activation_period');
});

//리포트 >> 설비별 가동율
app.get('/activation_facility', async (req, res) => {
	res.render('report/activation_facility');
});

//리포트 >> 비가동 분석
app.get('/analysis_unactivation', async (req, res) => {
	res.render('report/analysis_unactivation');
});

//리포트 >> 불량 분석
app.get('/analysis_defective', async (req, res) => {
	let row = await asyncQuery(`
							with tempA as(
								SELECT 
									a.order_key ,
									b.item	,
									sum(a.qty) as sum ,
									a.quality ,
									b.qty 
								FROM
									mes_win.defective_history a 
								left join mes_win.process b 
									on a.order_key = b.order_key
								where a.quality in('o','x')
								group by a.order_key 
							), tempB as(
								select 
									IF (a.sum = a.qty , '1' , '0') as result,
									a.order_key ,
									a.sum ,
									a.qty ,
									a.item									
								from tempA a														
							), tempC as (
								SELECT 
									a.order_key ,
									b.item	,
									sum(a.qty) as o_sum ,
									a.quality ,
									b.qty 
								FROM
									mes_win.defective_history a 
								left join mes_win.process b 
									on a.order_key = b.order_key
								where a.quality in('o')
								group by a.order_key 								
							), tempD as (
								SELECT 
									a.order_key ,
									b.item	,
									sum(a.qty) as x_sum ,
									a.quality ,
									b.qty 
								FROM
									mes_win.defective_history a 
								left join mes_win.process b 
									on a.order_key = b.order_key
								where a.quality in('x')
								group by a.order_key 								
							), tempE as(
								select b.*,c.o_sum,d.x_sum from tempB b	
								left join tempC c on b.order_key = c.order_key
								left join tempD d on b.order_key = d.order_key
								where b.result = 1													
							)select 
								e.item,
								IFNULL(SUM( e.sum),0) as sum,
								IFNULL(SUM( e.qty),0) as qty,
								IFNULL(SUM( e.o_sum),0) as o_sum,
								IFNULL(SUM( e.x_sum),0) as x_sum,
								IFNULL(ROUND((SUM( e.x_sum) / SUM( e.qty))*100,1),0) as avg
							from tempE e
							group by e.item
								`);
	res.render('report/analysis_defective', { row: row });
});
//리포트 >> 불량 분석 아래 그리드 조회
app.get('/analysis_defective_detail/:name', async (req, res) => {
	let row = await asyncQuery(`
							with tempA as(
								SELECT  
									a.order_key,
									a.quality,
									a.comment,
									a.updatetime, 
									sum(a.qty) as o_qty,
									b.item 									
									FROM mes_win.defective_history as a 
									left join mes_win.process as b
									on a.order_key = b.order_key
									WHERE a.quality ='o'
									group by a.order_key
							), tempB as(
									SELECT  
									a.order_key,
									a.quality,
									a.comment,
									a.updatetime, 
									sum(a.qty) as x_qty,
									b.item 									
									FROM mes_win.defective_history as a 
									left join mes_win.process as b
									on a.order_key = b.order_key
									WHERE a.quality ='x'
									group by a.order_key
							) select 
								a.item ,
								a.o_qty ,
								b.x_qty ,
								round(b.x_qty/(a.o_qty + b.x_qty)*100,1) as avg
							from tempA a
							left join tempB b
							on a.order_key = b.order_key 
								`);

	let rows = await asyncQuery(` 
							SELECT 
								a.order_key ,
								a.item ,
								DATE_FORMAT(a.order_time, "%Y-%m-%d") as order_time,								
								b.work_qty ,
								DATE_FORMAT(b.end_time , "%Y-%m-%d") as end_time								
							from mes_win.process a 
							left join mes_win.work_history b 
								on a.order_key = b.order_key 
							where a.item = '${req.params.name}'
							order by a.no desc
 								`);

	let row2 = `${req.params.name}`;
	res.render('report/analysis_defective_detail', { row: row, rows: rows, row2: row2 });
});

//리포트 >> KPI
app.get('/kpi', async (req, res) => {
	res.render('report/kpi');
});
//리포트 >> 게시판
app.get('/board', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.idx = 1
								order by a.no desc
								`);
	res.render('report/board', { row: row });
});

//리포트 >> 게시판 검색
app.post('/board_search', async (req, res) => {
	let row = '';
	const keyword = `%${req.body.s_keyword}%`;
	console.log('keyword : ' + keyword);
	console.log('s_where : ' + req.body.s_where);

	if (req.body.s_keyword) {
		if (req.body.s_where) {
			row = await asyncQuery(`
										SELECT * FROM mes_win.board a
										WHERE ${req.body.s_where} LIKE '${keyword}'		
										and a.idx = 1
										`);
		} else {
			row = await asyncQuery(`
										SELECT * FROM mes_win.board a
										WHERE (a.subject LIKE '${keyword}' OR a.content LIKE '${keyword}')
										and a.idx = 1
										`);
		}
	} else {
		row = await asyncQuery(`
										SELECT * FROM mes_win.board a
										where a.idx = 1
										`);
	}
	res.render('report/board', { row: row });
});

//리포트 >> 게시판 상세보기
app.get('/board_detail/:idx', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.idx = 1
								and a.no = ${req.params.idx}
								`);
	res.render('report/board_detail', { row: row });
});
//리포트 >> 게시판 등록페이지
app.get('/board_add', async (req, res) => {
	res.render('report/board_add');
});
//리포트 >> 게시판 등록
app.post('/board_add_add', async (req, res) => {
	let add = await asyncQuery(
		`
							INSERT INTO mes_win.board (								
								subject,
								content,
								submit_time,
								idx
							)
							VALUES (?,?,sysdate(),1)`,
		[req.body.subject, req.body.contents]
	);
	res.send('ok');
});

//리포트 >> 게시판 수정페이지 이동
app.get('/board_update/:idx', async (req, res) => {
	let row = await asyncQuery(`
								select 
									a.no ,
									a.username ,
									a.subject ,
									a.content ,
									a.submit_time ,
									a.update_time
								from mes_win.board a
								where a.idx = 1
								and a.no = ${req.params.idx}
								`);
	res.render('report/board_update', { row: row });
});
//리포트 >> 게시판 수정
app.post('/board_update_add', async (req, res) => {
	console.log('수정버튼');
	let add = await asyncQuery(`
								UPDATE mes_win.board a
								set a.subject='${req.body.board_subject}',
									a.content='${req.body.board_content}'									
									where a.no = ${req.body.board_no}
									and a.idx = 1
							`);
	res.send('ok');
});

//리포트 >> 게시판 삭제
app.post('/board_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');

		let rows = await asyncQuery(`
								SELECT  
									no	
								FROM mes_win.board
								where no in(${sParm})	
								and idx = 1
		`);
		if (rows != '') {
			if (
				!(await asyncQuery(`DELETE FROM mes_win.board WHERE no IN (${sParm}) and idx = 1`))
			) {
				return res.send(`<script>alert('삭제 실패'); location='/board';</script>`);
			} else {
				res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/board';</script>`);
			}
		} else {
			res.send(
				`<script>alert('내역이 존재하여 삭제할 수 없습니다.'); location='/board';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/board';</script>`);
});

app.post('/order_add_select_num', async (req, res) => {
	let customer_info = await asyncQuery(
		`SELECT * FROM mes_win.customer_info WHERE no = ${req.body.index}`
	);
	res.send(customer_info);
});
app.post('/order_add_select_num', async (req, res) => {
	let customer_info = await asyncQuery(
		`SELECT * FROM mes_win.customer_info WHERE no = ${req.body.index}`
	);
	res.send(customer_info);
});
app.post('/order_add_select_num', async (req, res) => {
	let customer_info = await asyncQuery(
		`SELECT * FROM mes_win.customer_info WHERE no = ${req.body.index}`
	);
	res.send(customer_info);
});
app.post('/order_add_select_num', async (req, res) => {
	let customer_info = await asyncQuery(
		`SELECT * FROM mes_win.customer_info WHERE no = ${req.body.index}`
	);
	res.send(customer_info);
});
app.post('/order_add_select_num', async (req, res) => {
	let customer_info = await asyncQuery(
		`SELECT * FROM mes_win.customer_info WHERE no = ${req.body.index}`
	);
	res.send(customer_info);
});

app.get('/login', async (req, res) => {
	res.render('login/login');
});

app.get('/register', async (req, res) => {
	res.render('login/register');
});

// 회원가입 > 사원번호 중복 확인
app.post('/emp_check', async (req, res) => {
	let check = await asyncQuery(
		`select * from mes_win.user_info where id = '${req.body.employee_code}'`
	);
	if (check != 0) {
		res.send('중복');
	} else {
		res.send('ok');
	}
});

// 회원가입 신청
app.post('/submit_All', async (req, res, err) => {
	let check = await asyncQuery(
		`select * from mes_win.user_info where id = '${req.body.employee_code}'`
	);

	let pw = bcrypt.hashSync(req.body.pass);
	let add = await asyncQuery(
		`INSERT INTO mes_win.user_info (id,pass,name,department,InsertTime)
					VALUES (?,?,?,?,sysdate())`,
		[req.body.employee_code, pw, req.body.name, req.body.department]
	);
	if (check != 0) {
		res.send('중복');
	} else {
		if (add != 0) {
			console.log('회원가입 완료');
			res.send('ok');
		} else {
			res.send('fail');
		}
	}
});

// 로그인
app.post('/login/action', function (req, res, next) {
	passport.authenticate('local', function (err, user, info) {
		console.log(err)
		console.log(user)
		console.log(info)
		if (err) {
			return res.send(`<script>alert('로그인 에러'); location='/login'</script>`);
		}
		if (!user) {
			return res.send(`<script>alert('${info.message}'); location='/login'</script>`);
		}

		//정상
		req.logIn(user, (err) => {
			console.log('testsetsetsetsetsetsetset');
			console.log(user);
			const userIp = requestIp.getClientIp(req);
			res.clearCookie('access');
			res.clearCookie('id');
			res.cookie('access', user.access, cookieConfig);
			res.cookie('id', user.id, cookieConfig);
			return res.redirect('/');
		});
	})(req, res, next);
});

// 로그아웃 처리
app.use('/logout', (req, res) => {
	req.logout((err) => {
		if (err) {
			return next(err);
		}
		res.clearCookie('id');
		res.clearCookie('access');
		req.session.destroy();
		res.redirect('/login');
	});
});

//기준 정보 >> 자재 정보(대경) >> 기초 데이터 조회
app.get('/material', async (req, res) => {
	let row = await asyncQuery(`SELECT no,
									   name,
									   sortation,
									   material,
									   thickness,
									   width,
									   height,
									   diameter,
									   length,
									   qty,
									   DATE_FORMAT(UpdateTime, "%Y-%m-%d") as UpdateTime,
									   etc
								FROM mes_win.material
								ORDER BY no DESC`);
	res.render('material_manage/material', { row: row });
});

//기준 정보 >> 자재 정보(대경) >> 기초 데이터 등록
app.post('/material_add', async (req, res) => {
	let result = await asyncQuery(`
								select * from mes_win.material a where a.name = '${req.body.name}'
								`);
	if (result != 0) {
		res.send('n');
	} else {
		let add = await asyncQuery(
			`INSERT INTO mes_win.material (name,sortation,material,thickness,width,height,diameter,length,etc,qty)
									VALUES (?,?,?,?,?,?,?,?,?,0)`,
			[
				req.body.name,
				req.body.sortation,
				req.body.material,
				req.body.thickness,
				req.body.width,
				req.body.height,
				req.body.diameter,
				req.body.length,
				req.body.etc,
			]
		);
		res.send('y');
	}
});

//기준 정보 >> 자재 정보(대경) >> 데이터 업데이트 조회
app.post('/material_update_select', async (req, res) => {
	let row = await asyncQuery(`SELECT * from mes_win.material where no = ${req.body.no}`);
	console.log(row);
	res.send(row);
});

app.post('/material_update', async (req, res) => {
	var name = req.body.name;
	var sortation = req.body.sortation;
	var material = req.body.material;
	var thickness = req.body.thickness;
	var width = req.body.width;
	var height = req.body.height;
	var diameter = req.body.diameter;
	var length = req.body.length;
	var reason = req.body.reason;
	var etc = req.body.etc;
	if (name == '') {
		name = '';
	}
	if (sortation == '') {
		sortation = '';
	}
	if (material == '') {
		material = '';
	}
	if (thickness == '') {
		thickness = '';
	}
	if (width == '') {
		width = '';
	}
	if (height == '') {
		height = '';
	}
	if (diameter == '') {
		diameter = '';
	}
	if (length == '') {
		length = '';
	}
	if (reason == '') {
		reason = '';
	}
	if (etc == '') {
		etc = '';
	}
	let row = await asyncQuery(`UPDATE mes_win.material
								set name='${name}',
									sortation='${sortation}',
									material='${material}',
									thickness='${thickness}',
									width='${width}',
									height='${height}',
									diameter='${diameter}',
									length='${length}',									
									etc='${etc}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 자재 정보(대경) >> 데이터 삭제
app.post('/material_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		let rows = await asyncQuery(`
								SELECT a.no,
									   a.name,
									   a.sortation,
									   a.material,
									   a.thickness,
									   a.width,
									   a.height,
									   a.diameter,
									   a.length,
									   a.qty,
									   DATE_FORMAT(a.UpdateTime, "%Y-%m-%d") as UpdateTime,
									   a.etc ,
									   b.state 
								FROM mes_win.material a
								inner join mes_win.material_history b
								on a.name = b.name 
								where a.no in (${sParm})
								group by a.name 
								ORDER BY no DESC
							`);
		if (rows == '') {
			if (!(await asyncQuery(`DELETE FROM mes_win.material WHERE no IN (${sParm})`))) {
				return res.send(`<script>alert('삭제 실패'); location='/material';</script>`);
			} else {
				res.send(
					`<script>alert('삭제가 완료 되었습니다.'); location='/stock_manage';</script>`
				);
			}
		} else {
			res.send(
				`<script>alert('입/출고 관리내역이 존재하여 삭제할 수 없습니다.'); location='/stock_manage';</script>`
			);
		}
	}
	res.send(`<script>alert('체크박스를 선택해주세요.'); location='/stock_manage';</script>`);
});

//기준 정보 >> 자재 정보(윈럭스) >> 기초 데이터 조회
app.get('/material_lux', async (req, res) => {
	let row = await asyncQuery(`SELECT no,
									   proc,
									   weaving_info,
									   company,
									   sort,
									   product,
									   name,
									   detail,
									   width_detail,
									   fl_classify,
									   length,
									   radius,
									   meter,
									   barcode,
									   barcode_yn,
									   etc
								FROM mes_win.material_lux
								ORDER BY no DESC`);

	res.render('standard_info/material_lux', { row: row });
});

//기준 정보 >> 자재 정보(윈럭스) >> 데이터 등록 POST
app.post('/material_lux_add', async (req, res) => {
	console.log(req.body);
	let add = await asyncQuery(
		`INSERT INTO mes_win.material_lux (proc,weaving_info,company,sort,product,name,detail,width_detail,fl_classify,
															 length,radius,meter,barcode,barcode_yn,etc)
								VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		[
			req.body.proc,
			req.body.weaving_info,
			req.body.company,
			req.body.sort,
			req.body.product,
			req.body.name,
			req.body.detail,
			req.body.width_detail,
			req.body.fl_classify,
			req.body.length,
			req.body.radius,
			req.body.meter,
			req.body.barcode,
			req.body.barcode_yn,
			req.body.etc,
		]
	);
	res.send('y');
});

//기준 정보 >> 자재 정보(윈럭스) >> 수정 팝업 데이터 맵핑을 위한 조회
app.post('/material_lux_update_select', async (req, res) => {
	let row = await asyncQuery(`SELECT * from mes_win.material_lux where no = ${req.body.no}`);
	console.log(row);
	res.send(row);
});

//기준 정보 >> 자재 정보(윈럭스) >> 수정 팝업 데이터 저장을 위한 POST
app.post('/material_lux_update', async (req, res) => {
	var proc = req.body.proc;
	var weaving_info = req.body.weaving_info;
	var company = req.body.company;
	var sort = req.body.sort;
	var product = req.body.product;
	var name = req.body.name;
	var detail = req.body.detail;
	var fl_classify = req.body.fl_classify;
	var length = req.body.length;
	var radius = req.body.radius;
	var meter = req.body.meter;
	var barcode = req.body.barcode;
	var barcode_yn = req.body.barcode_yn;
	var etc = req.body.etc;
	if (proc == '') {
		proc = '';
	}
	if (weaving_info == '') {
		weaving_info = '';
	}
	if (company == '') {
		company = '';
	}
	if (sort == '') {
		sort = '';
	}
	if (product == '') {
		product = '';
	}
	let row = await asyncQuery(`UPDATE mes_win.material_lux
								set proc='${proc}',
									weaving_info='${weaving_info}',
									company='${company}',
									sort='${sort}',
									product='${product}',
									name='${name}',
									detail='${detail}',
									fl_classify='${fl_classify}',
									length='${length}',
									radius='${radius}',
									detail='${detail}',
									fl_classify='${fl_classify}',
									length='${length}',
									radius='${radius}',
									meter='${meter}',
									barcode='${barcode}',
									barcode_yn='${barcode_yn}',
									etc='${etc}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 자재 정보(윈럭스) >> 데이터 삭제
app.post('/material_lux_delete', async (req, res) => {
	if (req.body.chList) {
		const sParm =
			typeof req.body.chList == 'string' ? req.body.chList : req.body.chList.join(',');
		if (!(await asyncQuery(`DELETE FROM mes_win.material_lux WHERE no IN (${sParm})`)))
			return res.send(`<script>alert('삭제 실패'); location='/material_lux';</script>`);
	}
	res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/material_lux';</script>`);
});

//기준 정보 >> 수주 등록 >> 등록
// app.post("/order_add_add", async (req, res) => {

// 	let add = await asyncQuery(`INSERT INTO DG.order_add (order_place, order_manager, order_time, shipment_time, process, order_content)
// 					VALUES (?,?,?,?,?,?)`,[req.body.order_place,
// 										   req.body.order_manager,
// 										   req.body.order_time,
// 										   req.body.shipment_time,
// 									  	   req.body.process,
// 										   req.body.order_content
// 											]);
// 	res.send('y');
// });

//기준 정보 >> 표준 설비 >> 수정 팝업 데이터 맵핑을 위한 조회
// app.post("/standard_facility_update_select", async (req, res) => {
// 	let row = await asyncQuery(`SELECT * from DG.standard_facility where no = ${req.body.no}`);
// 	res.send(row);
// });

// 테이블 생성 디폴트
/*CREATE TABLE `standard_facility` (
  `no` int(11) NOT NULL AUTO_INCREMENT,
  `UpdateTime` datetime NOT NULL,
  PRIMARY KEY (`No`)
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8;*/

