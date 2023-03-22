

//pm2 start ./pm2-config.json
//pm2 logs 0
// 테스트
const express = require("express");
const app = express();
var path = require("path");
const PORT = 3000;
var fs = require('fs');
var request = require('request');

app.use("/js", express.static(path.join(__dirname, "/js")));
app.use("/vendor", express.static(path.join(__dirname, "/vendor")));
app.use("/css", express.static(path.join(__dirname, "/css")));
app.use("/scss", express.static(path.join(__dirname, "/scss")));
app.use("/img", express.static(path.join(__dirname, "/img")));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


const mysql2 = require("mysql2/promise");
const _pool = mysql2.createPool({
host: "61.76.6.163",
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


app.get("/", async (req, res) => {

res.render("tables")
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
										a.o_qty,
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
			if(row==""){
				const happyNewYear = new Date();
				const year = happyNewYear.getFullYear();
				const month = happyNewYear.getMonth() + 1;
				const date = happyNewYear.getDate();
				var y = year;
				var m = month >= 10 ? month : '0'+month;
				var d = date >= 10 ? date : '0' + date;
				var full_day = y + "-" + m + "-" + d;
				var arr= [{manufacturing_time: full_day,no:'x'}]
				res.render("day_log",{row:arr})
			}
			else{
				res.render("day_log",{row:row})		
			}
});

// 일일 검사 현황 등록 버튼
app.post("/day_log_save", async (req, res) => {
	let option = await asyncQuery(`
									UPDATE winlux_materials.work_option
									SET 
									o_qty = '${req.body.oqty_sum}',
									x_qty = '${req.body.x_qty}',
									etc2 = '${req.body.etc2}',
									state = '4',
									day_log_time = '보류'
									where no = '${req.body.no}'
						`)
	
	let INSERT = await asyncQuery(`
									INSERT INTO winlux_materials.shipment_info(
									code,
									item,
									color,
									o_qty
									)
									VALUES (
									'${req.body.code}',
									'${req.body.item}',
									'${req.body.color}',
									'${req.body.oqty_sum}'
									)
						`)
	
	


res.send('y');
});

// 거래처 정보
app.get("/customer_info", async (req, res) => {
	let row = await asyncQuery(`
							SELECT 
								*
							from winlux_materials.customer_info ci
							`);
	
	res.render("customer_info",{row:row});
});


//기준 정보 >> 거래처 정보 >> 등록
app.post("/customer_info_add", async (req, res) => {
		let add = await asyncQuery(`INSERT INTO winlux_materials.customer_info (
								client_name,
								business_number,
								ceo,
								phone_number,
								address,
								type_select,
								mutual,
								address1,
								address2,
								address3,
								address4,
								address5,
								fax_number,
								business_type,
								business_type1,
								ceo_phone_number,
								email
								)
					VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
										  [req.body.client_name,
										   req.body.business_number,
										   req.body.ceo,
										   req.body.phone_number,
									  	   req.body.address,
									  	   req.body.type_select,
										   req.body.mutual,
										   req.body.address1,
										   req.body.address2,
										   req.body.address3,
										   req.body.address4,
										   req.body.address5,
										   req.body.fax_number,
										   req.body.business_type,
										   req.body.business_type1,
										   req.body.ceo_phone_number,
										   req.body.email
									  	   ]);
	res.send('y');
});

//기준 정보 >> 거래처 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post("/customer_info_update_select", async (req, res) => {
	let row = await asyncQuery(`SELECT * from winlux_materials.customer_info where no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 거래처 정보 >> 수정
app.post("/customer_info_update", async (req, res) => {
	var client_name = req.body.client_name;
	var business_number = req.body.business_number;
	var ceo = req.body.ceo;
	var phone_number = req.body.phone_number;
	var address = req.body.address;
	var type_select = req.body.type_select;
	var mutual = req.body.mutual;
	var address1 = req.body.address1;
	var address2 = req.body.address2;
	var address3 = req.body.address3;
	var address4 = req.body.address4;
	var address5 = req.body.address5;
	var fax_number = req.body.fax_number;
	var business_type = req.body.business_type;
	var business_type1 = req.body.business_type1;
	var ceo_phone_number = req.body.ceo_phone_number;
	var email = req.body.email;
	
	if(client_name==""){client_name=''}
	if(business_number==""){business_number=''}
	if(ceo==""){ceo=''}
	if(phone_number==""){phone_number=''}
	if(address==""){address=''}
	if(type_select==""){type_select=''}
	if(mutual==""){mutual=''}
	if(address1==""){address1=''}
	if(address2==""){address2=''}
	if(address3==""){address3=''}
	if(address4==""){address4=''}
	if(address5==""){address5=''}
	if(fax_number==""){fax_number=''}
	if(business_type==""){business_type=''}
	if(business_type1==""){business_type1=''}
	if(ceo_phone_number==""){ceo_phone_number=''}
	if(email==""){email=''}
	
	let row = await asyncQuery(`UPDATE winlux_materials.customer_info
								set client_name='${client_name}',
									business_number='${business_number}',
									ceo='${ceo}',
									phone_number='${phone_number}',
									address='${address}',
									type_select='${type_select}',
									mutual='${mutual}',
									address1='${address1}',
									address2='${address2}',
									address3='${address3}',
									address4='${address4}',
									address5='${address5}',
									fax_number='${fax_number}',
									business_type='${business_type}',
									business_type1='${business_type1}',
									ceo_phone_number='${ceo_phone_number}',
									email='${email}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 거래처 정보 >> 체크박스 삭제
app.post("/customer_info_delete", async (req, res) => {
	if (req.body.chList) {
    const sParm =
      typeof req.body.chList == "string"
        ? req.body.chList
        : req.body.chList.join(",");
    if (!(await asyncQuery(`DELETE FROM winlux_materials.customer_info WHERE no IN (${sParm})`)))
      return res.send(
        `<script>alert('삭제 실패'); location='/customer_info';</script>`
      );
  }
  res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/customer_info';</script>`);
});



// 재고 관리
app.get("/inventory_manag", async (req, res) => {
	let row = await asyncQuery(`
								select 
										item,
										color,
										o_qty,
										code,
										no
									from winlux_materials.shipment_info as a
									where o_qty not in('0')
									`)
	
	
	
	
	
res.render("inventory_manag",{row:row})
});

// 출하 현황
app.get("/shipment_manag", async (req, res) => {
	let row = await asyncQuery(`
									select 
										*
									from winlux_materials.shipment_info
									
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

app.post("/shipment_add", async (req, res) => {
	
	
	if(`${req.body.o_qty}`>=`${req.body.shipment_qty}`){
		var qty = `${req.body.o_qty}`-`${req.body.shipment_qty}`;	
		console.log(`${req.body.o_qty}`)
		console.log(`${req.body.shipment_qty}`)
		let row = await asyncQuery(`		
						INSERT INTO winlux_materials.shipment_his (
						item,
						color,
						code,
						shipment_date,
						shipment_qty,
						client_name
						)
						VALUES (
						'${req.body.item}',
						'${req.body.color}',
						'${req.body.code}',
						'${req.body.shipment_date}',
						'${req.body.shipment_qty}',
						'${req.body.client_name}'
						);
					`);
		let UPDATE = await asyncQuery(`		
						UPDATE winlux_materials.shipment_info 
						set o_qty = '${qty}'
						where code = '${req.body.code}'
					`);
	}else{
		res.send('수량이 부족합니다.');
	}
	
	
	
	res.send('y');
});


//기준 정보 >> 제품 정보
app.get("/product_info", async (req, res) => {
	let row = await asyncQuery(`
							SELECT 
								*
							from winlux_materials.product_info
							`);
	let inventory = await asyncQuery(`
									select 
										item,
										color,
										sum(o_qty) as o_qty 
									from winlux_materials.work_option
									where not o_qty is null
									group by item, color 
									`)
	res.render("product_info",{row:row,inventory:inventory});
});


//기준 정보 >> 제품 정보 >> 등록
app.post("/product_info_add", async (req, res) => {
		let add = await asyncQuery(`INSERT INTO winlux_materials.product_info (
								item,
								color,
								code
								)
					VALUES (?,?,?)`,
										  [req.body.item,
										   req.body.color,
										   req.body.code
									  	   ]);
	res.send('y');
});

//기준 정보 >> 제품 정보 >> 수정 팝업 데이터 맵핑을 위한 조회
app.post("/product_info_update_select", async (req, res) => {
	let row = await asyncQuery(`SELECT * from winlux_materials.product_info where no = ${req.body.no}`);
	res.send(row);
});

//기준 정보 >> 제품 정보 >> 수정
app.post("/product_info_update", async (req, res) => {
	var item = req.body.item;
	var color = req.body.color;
	var code = req.body.code;
	if(item==""){item=''}
	if(color==""){color=''}
	if(code==""){code=''}
	
	let row = await asyncQuery(`UPDATE winlux_materials.product_info
								set item='${item}',
									color='${color}',
									code='${code}'
									where no = ${req.body.no}`);
	res.send('y');
});

//기준 정보 >> 제품 정보 >> 체크박스 삭제
app.post("/product_info_delete", async (req, res) => {
	if (req.body.chList) {
    const sParm =
      typeof req.body.chList == "string"
        ? req.body.chList
        : req.body.chList.join(",");
    if (!(await asyncQuery(`DELETE FROM winlux_materials.product_info WHERE no IN (${sParm})`)))
      return res.send(
        `<script>alert('삭제 실패'); location='/product_info';</script>`
      );
  }
  res.send(`<script>alert('삭제가 완료 되었습니다.'); location='/product_info';</script>`);
});


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
										*
									from winlux_materials.shipment_his
									`)
res.render("shipment_his",{row:row})
});