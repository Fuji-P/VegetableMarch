"use strict";
let ctx;				//グラフィックコンテキスト
let engine;				//物理エンジン
let veges = [];			//野菜を格納する配列
let images = [];		//野菜の画像を格納する配列
let timer = NaN;		//タイマー
let startTime = NaN;	//ゲーム開始時刻
let elapsed = 0;		//経過時間
let score = 0;			//スコア
let walls = [			//壁オブジェクト
	[-60, -100, 100, 800],
	[500, -100, 100, 800],
	[-60, 520, 700, 100],
];

function rand(v) {
	return Math.floor(Math.random() * v);
}

function init() {
	//エンジン初期化&Canvas初期化
	let canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	ctx.font = "20pt Arial";
	ctx.strokeStyle = "blue";
	ctx.lineWidth = 5;
	ctx.texAlign = "center";

	//物理エンジンオブジェクトの作成
	engine = new Engine(-100, -100, 700, 700, 0, 9.8);

	//壁
	walls.forEach(function (w) {
		let r = new RectangleEntity(w[0], w[1], w[2], w[3]);
		r.color = "gray";
		engine.entities.push(r);
	});

	//野菜
	for (let i = 0; i < 7; i++) {
		for (let j = 0; j < 10; j++) {
			let x = i * 60 + 75 + rand(5);
			let y = j * 50 + 50 + rand(5);
			let r = new CircleEntity(x, y, 25, BodyDynamic, 1, 0.98);
			r.color = rand(5);
			engine.entities.push(r);
		}
	}
	for (let i = 0; i < 5; i++) {
		images.push(document.getElementById("fruit" + i));
	}
	repaint();
}

function go() {

	//canvasのタッチやマウスのイベントハンドラを登録
	let canvas = document.getElementById("canvas");
	canvas.onmousedown = mymousedown;
	canvas.onmousemove = mymousemove;
	canvas.onmouseup = mymouseup;
	canvas.addEventListener('touchstart', mymousedown);
	canvas.addEventListener('touchmove', mymousemove);
	canvas.addEventListener('touchend', mymouseup);

	//タッチ時にコンテキストメニューが表示されるのを防止する
	document.body.addEventListener('touchmove', function (event) {
		event.preventDefault();
	}, false);

	//スタートボタンを非表示にする
	document.getElementById("START").style.display = "none";

	//BGMの再生を開始
	document.getElementById("bgm").play();

	startTime = new Date();

	//メインループを開始
	timer = setInterval(tick, 50);
}

//メインループ
function tick() {
	//物理エンジンの時刻を進める
	engine.step(0.01);

	elapsed = ((new Date()).getTime() - startTime) / 1000;

	//57秒(BGMの再生時間)を過ぎたらタイマーを停止
	if (elapsed > 57) {
		clearInterval(timer);
		timer = NaN;
	}
	//再描画
	repaint();
}

function mymousedown(evt) {
	let x = !isNaN(evt.offsetX) ? evt.offsetX : evt.touches[0].clientX;
	let y = !isNaN(evt.offsetY) ? evt.offsetY : evt.touches[0].clientY;
	engine.entities.forEach(function (e) {
		//マウスやタッチ押下時、その座標に野菜オブジェクトがあった場合
		if (e.isHit(x, y) && e.shape == ShapeCircle) {
			//オブジェクトを配列vegesに格納
			veges.push(e);
			//オブジェクトのselectedプロパティをtrueに設定
			e.selected = true;
		}
	});
}

function mymousemove(evt) {
	//veges配列が空のとき
	if (veges.length == 0) {
		return;
	}

	let x = !isNaN(evt.offsetX) ? evt.offsetX : evt.touches[0].clientX;
	let y = !isNaN(evt.offsetY) ? evt.offsetY : evt.touches[0].clientY;

	//配列にある最後の野菜を取得し、変数pに格納
	let p = veges[veges.length - 1];

	engine.entities.forEach(function (e) {
		//マウスが動いたとき、最後に選ばれた野菜と今のマウス位置にある野菜を比較し、
		//距離が近く同じ野菜のときに限り、その野菜を選択するという処理を行う
		//対象となるオブジェクトにマウスの座標が含まれているか、形状が円か否か
		if (e.isHit(x, y) && e.shape == ShapeCircle) {
			//すでに野菜が選択されていないか(配列vegesに含まれていないか=「veges.indexOf(e) < 0」)
			//かつ最後の野菜と今の野菜が同じ種類か(「e.color == p.color」)
			if (veges.indexOf(e) < 0 && e.color == p.color) {
				let d2 = Math.pow(e.x - p.x, 2) + Math.pow(e.y - p.y, 2);
				//
				if (d2 < 4000) {
					veges.push(e);
					e.selected = true;
				}
			}
		}
	});
}

function mymouseup(evt) {
	//選択状態の野菜が2つ以上ある場合
	if (veges.length > 1) {
		//選択状態の野菜を削除
		engine.entities = engine.entities.filter(function (e) {
			return e.selected != true;
		});
		//消去分を追加
		for (let i = 0; i < veges.length; i++) {
			let x = 75 + rand(350);
			let r = new CircleEntity(x, 0, 25, BodyDynamic, 1, 0.98);
			r.color = rand(5);
			engine.entities.push(r);
		}
		score += veges.length * 100;
	}
	veges.forEach(function (e) {
		delete e.selected;
	});
	veges = [];
}

function repaint() {
	//背景クリア
	ctx.drawImage(fruitbg, 0, 0);

	//野菜
	for (let i = 0; i < engine.entities.length; i++) {
		let e = engine.entities[i];
		let img = images[e.color];
		if (e.shape == ShapeCircle) {
			ctx.drawImage(img, e.x - 28, e.y - 28, 62, 62);
			if (e.selected) {
				ctx.strokeStyle = "yellow";
				ctx.beginPath();
				ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.stroke();
			}
		}
	}

	//線
	if (veges.length > 0) {
		ctx.strokeStyle = "#B1EB22";
		ctx.beginPath();
		ctx.moveTo(veges[0].x, veges[0].y);
		for (let i = 1; i < veges.length; i++) {
			ctx.lineTo(veges[i].x, veges[i].y);
		}
		ctx.stroke();
	}

	//メッセージ
	ctx.save();
	ctx.fillStyle = "#F9D79F";
	ctx.font = "bold 24pt sans-serif";
	ctx.font;
	ctx.translate(600, 442);
	ctx.rotate(-0.05);
	ctx.fillText(isNaN(timer) ? "FINISH" : "Score", 0, 0);
	ctx.restore();

	//スコア
	ctx.save();
	ctx.font = "bold 32pt sans-serif";
	ctx.translate(560, 350);
	ctx.rotate(0.08);
	ctx.fillStyle = "#F9D79F";
	ctx.fillText(('0000000' + score).slice(-7), 0, 0);
	ctx.restore();

	//残り時間
	ctx.save();
	ctx.fillStyle = 'rgba(215, 130, 40, 0.5)';
	ctx.beginPath();
	ctx.moveTo(656, 153);
	ctx.arc(656, 153, 88, -Math.PI / 2, elapsed / 57 * Math.PI * 2 - Math.PI / 2);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}