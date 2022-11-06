"use strict";

//定数定義
let BodyStatic = 1;
let BodyDynamic = 2;
let ShapeCircle = 3;
let ShapeRectangle = 4;
let ShapeLine = 5;

//ベクトル用クラスの定義
function Vec(x, y) {
	this.x = x;
	this.y = y;
}

//加算
Vec.prototype.add = function (v) {
	return new Vec(this.x + v.x, this.y + v.y);
}

//掛算
Vec.prototype.mul = function (x, y) {
	let tempY = y || x;
	return new Vec(this.x * x, this.y * tempY);
}

//内積
Vec.prototype.dot = function (v) {
	return this.x * v.x + this.y * v.y;
}

//外積
Vec.prototype.cross = function (v) {
	return this.x * v.y - v.x * this.y;
}

//自分を移動
Vec.prototype.move = function (dx, dy) {
	this.x += dx;
	this.y += dy;
}

//矩形オブジェクト
function RectangleEntity(x, y, width, height) {
	//形状を指定
	this.shape = ShapeRectangle;
	//固定を指定
	this.type = BodyStatic;
	//プロパティを設定
	this.x = x;
	this.y = y;
	this.w = width;
	this.h = height;
	//減速度合(矩形は動かさないので1)
	this.deceleration = 1.0;
	//衝突判定用のメソッド
	//(i, j)が矩形の中にあるときにtrueを返す
	this.isHit = function(i, j) {
		return (this.x <= i && i <= this.x + this.w &&
				this.y <= j && j <= this.y + this.h)
	}
}

//線オブジェクト
function LineEntity(x0, y0, x1, y1, restitution) {
	//形状を指定
	this.shape = ShapeLine;
	//固定を指定
	this.type = BodyStatic;
	//線分の中点をプロパティに設定
	this.x = (x0 + x1) / 2;
	this.y = (y0 + y1) / 2;
	//始点・終点をプロパティに設定
	this.x0 = x0;
	this.y0 = y0;
	this.x1 = x1;
	this.y1 = y1;

	//反発係数(引数で指定された場合はその値、省略された場合は0.9を使用)
	this.restitution = restitution || 0.9;
	//線分ベクトル
	this.vec = new Vec(x1 - x0, y1 - y0);
	let length = Math.sqrt(Math.pow(this.vec.x, 2) + Math.pow(this.vec.y, 2));
	//法線方向のベクトルを正規化
	//xとyを入れ替えてvecを長さlengthで割ること(=1 / lenghtを掛ける)で求める
	this.norm = new Vec(y0 - y1, x1 - x0).mul(1 / length);
}

//円オブジェクト
function CircleEntity(x, y, radius, type, restitution, deceleration) {
	//形状を指定
	this.shape = ShapeCircle;
	//移動する円か固定する円かを指定
	this.type = type || BodyDynamic;
	//円の中心座標
	this.x = x;
	this.y = y;
	this.radius = radius;
	//反発係数
	this.restitution = restitution || 0.9;
	//減速度合
	this.deceleration = deceleration || 1.0;
	//加速度ベクトル
	this.accel = new Vec(0, 0);
	//速度ベクトル
	this.velocity = new Vec(0, 0);

	//円を移動
	this.move = function (dx, dy) {
		this.x += dx;
		this.y += dy;
	}

	//座標が円に含まれるかを判定
	this.isHit = function(x, y) {
		let d2 = Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2);
		return d2 < Math.pow(this.radius, 2);
	}

	//円と矩形の衝突
	this.collidedWithRect = function (r) {
		//矩形の4辺上で最も円に近い座標(nx, ny)を求める
		let nx = Math.max(r.x, Math.min(this.x, r.x + r.w));
		let ny = Math.max(r.y, Math.min(this.y, r.y + r.h));

		//円の中になければ衝突なし→リターン
		if (!this.isHit(nx, ny)) {
			return;
		}

		//衝突時のコールバック
		if (this.onhit) {
			this.onhit(this, r);
		}

		//(nx, ny)と円の中心座標(x, y)の距離の二乗
		let d2 = Math.pow(nx - this.x, 2) + Math.pow(ny - this.y, 2);
		//重なっている距離overlapを求める
		let overlap = Math.abs(this.radius - Math.sqrt(d2));

		//重なり部分の大きさ
		let mx = 0;
		let my = 0;

		//上辺衝突
		if (ny == r.y) {
			//下方向へ反転
			my = -overlap;
		}
		//下辺衝突
		else if (ny == r.y + r.h) {
			//上方向へ反転
			my = overlap;
		}
		//左辺衝突
		else if (nx == r.x) {
			//右方向へ反転
			mx = -overlap;
		}
		//右辺衝突
		else if (nx == r.x + r.w) {
			//左方向へ反転
			mx = overlap;
		}
		//矩形の中
		else {
			//velocityのxとyを反転して外に押し戻す
			mx = -this.velocity.x;
			my = -this.velocity.y;
		}

		//円の中心座標を移動して重なりを解消
		this.move(mx, my);
		//X軸方向へ反転
		if (mx) {
			this.velocity = this.velocity.mul(-1 * this.restitution, 1);
		}
		//Y軸方向へ反転
		if (my) {
			this.velocity = this.velocity.mul(1, -1 * this.restitution);
		}
	}

	//円と線の衝突
	this.collidedWithLine = function (line) {
		//円の中心から線分の始点へのベクトル
		//既に速度ベクトルが加算されて移動後の場所になっているため、速度ベクトルを引いている
		let v0 = new Vec(line.x0 - this.x + this.velocity.x, line.y0 - this.y + this.velocity.y);
		//円の速度ベクトル
		let v1 = this.velocity;
		//線分ベクトル
		let v2 = new Vec(line.x1 - line.x0, line.y1 - line.y0);
		//ベクトルの外積を求めて衝突判定を行う
		let cv1v2 = v1.cross(v2);
		let t1 = v0.cross(v1) / cv1v2;
		let t2 = v0.cross(v2) / cv1v2;
		let crossed = (0 <= t1 && t1 <= 1) && (0 <= t2 && t2 <= 1);

		//衝突した場合
		if (crossed) {
			//衝突前の座標に戻す
			this.move(-this.velocity.x, -this.velocity.y);
			//法線と速度の内積
			let dot0 = this.velocity.dot(line.norm);
			let vec0 = line.norm.mul(-2 * dot0);
			//もともとのベクトルに値を加算
			this.velocity = vec0.add(this.velocity);
			//反発係数をかけ合わせる
			this.velocity = this.velocity.mul(line.restitution * this.restitution);
		}
	}

	//円と円の衝突
	this.collidedWithCircle = function (peer) {
		//2つの円の中心距離を求める
		let d2 = Math.pow(peer.x - this.x, 2) + Math.pow(peer.y - this.y, 2);
		//中心距離が2つの円の半径の合計よりも大きい場合は衝突していない
		if (d2 >= Math.pow(this.radius + peer.radius, 2)) {
			return;
		}
		//衝突した場合
		if (this.onhit) {
			this.onhit(this, peer);
		}
		if (peer.onhit) {
			peer.onhit(peer, this);
		}
		//2つの円の中心の距離を格納する変数
		let distance = Math.sqrt(d2) || 0.01;
		//重なりの距離
		let overlap = this.radius + peer.radius - distance;
		//2つの円の中止員を結ぶベクトル
		let v = new Vec(this.x - peer.x, this.y - peer.y);

		//法線単位ベクトル1(vを円の中心間の距離distanceで割る)
		let aNormUnit = v.mul(1 / distance);
		//法線単位ベクトル2(逆向きの法線ベクトル)
		let bNormUnit = aNormUnit.mul(-1);

		//自分が動く円で相手が固定円の場合
		if (this.type == BodyDynamic && peer.type == BodyStatic) {
			//重なった量を移動し、2つの物体が重なっている状態を解消
			this.move(aNormUnit.x * overlap, aNormUnit.y * overlap);
			//法線と速度の内積
			let dot0 = this.velocity.dot(aNormUnit);
			let vec0 = aNormUnit.mul(-2 * dot0);
			this.velocity = vec0.add(this.velocity);
			this.velocity = this.velocity.mul(this.restitution);
		}
		//自分が固定円で相手が動く円の場合
		else if (peer.type == BodyDynamic && this.type == BodyStatic) {
			//重なった量を移動し、2つの物体が重なっている状態を解消
			peer.move(bNormUnit.x * overlap, bNormUnit.y * overlap);
			//法線と速度の内積
			let dot1 = peer.velocity.dot(bNormUnit);
			let vec1 = bNormUnit.mul(-2 * dot1);
			peer.velocity = vec1.add(peer.velocity);
			peer.velocity = peer.velocity.mul(peer.restitution);
		}
		//それ以外
		else {
			//重なった量の半分を移動し、2つの物体が重なっている状態を解消する
			this.move(aNormUnit.x * overlap / 2, aNormUnit.y * overlap / 2);
			peer.move(bNormUnit.x * overlap / 2, bNormUnit.y * overlap / 2);

			//接線ベクトル1(法線ベクトルのxとyを入れ替えて接線ベクトルを求める)
			let aTangUnit = new Vec(aNormUnit.y * -1, aNormUnit.x);
			//接線ベクトル2(法線ベクトルのxとyを入れ替えて接線ベクトルを求める)
			let bTangUnit = new Vec(bNormUnit.y * -1, bNormUnit.x);

			//aベクトル法線線分
			let aNorm = aNormUnit.mul(aNormUnit.dot(this.velocity));
			//aベクトル接線線分
			let aTang = aTangUnit.mul(aTangUnit.dot(this.velocity));
			//bベクトル法線線分
			let bNorm = bNormUnit.mul(bNormUnit.dot(peer.velocity));
			//bベクトル接線線分
			let bTang = bTangUnit.mul(bTangUnit.dot(peer.velocity));

			//反射後の速度
			this.velocity = new Vec(bNorm.x + aTang.x, bNorm.y + aTang.y);
			peer.velocity = new Vec(aNorm.x + bTang.x, aNorm.y + bTang.y);
		}
	}
}

//物理エンジン
function Engine(x, y, width, height, gravityX, gravityY) {
	//物理世界の左上座標
	this.worldX = x || 0;
	this.worldY = y || 0;
	//サイズ
	this.worldW = width || 1000;
	this.worldH = height || 1000;
	//重力
	this.gravity = new Vec(gravityX, gravityY);
	//円、矩形、線といった物理エンジンの世界のオブジェクトを保持する配列
	this.entities = [];

	//重力の向きを変える
	this.setGravity = function (x, y) {
		this.gravity.x = x;
		this.gravity.y = y;
	}

	//物理世界の時計を少しだけ進める
	this.step = function (elapsed) {
		//重力に経過時間を掛けて、その時間分の速度gravityを求める
		let gravity = this.gravity.mul(elapsed, elapsed);
		let entities = this.entities;

		//entityを移動
		entities.forEach(function (e) {
			if (e.type == BodyDynamic) {
				//加速度
				let accel = e.accel.mul(elapsed, elapsed);
				//速度gravityによる変化分を加算
				e.velocity = e.velocity.add(gravity);
				//加速度accelによる変化分を加算
				e.velocity = e.velocity.add(accel);
				//減速度合いを掛け合わせる
				e.velocity = e.velocity.mul(e.deceleration);
				//移動対象となるオブジェクトの速度を更新し、
				//その値に応じて移動させている
				e.move(e.velocity.x, e.velocity.y);
			}
		});

		//範囲外のオブジェクトを削除
		this.entities = entities.filter(function (e) {
			return this.worldX <= e.x && e.x <= this.worldX + this.worldW &&
					this.worldY <= e.y && e.y <= this.worldY + this.worldH;
		}, this);

		//衝突判定&衝突処理
		for (let i = 0; i < entities.length - 1; i++) {
			for (let j = i + 1; j < entities.length; j++) {
				let e0 = entities[i];
				let e1 = entities[j];
				if (e0.type == BodyStatic && e1.type == BodyStatic) {
					continue;
				}

				if (e0.shape == ShapeCircle && e1.shape == ShapeCircle) {
					e0.collidedWithCircle(e1);
				}
				else if (e0.shape == ShapeCircle && e1.shape == ShapeLine) {
					e0.collidedWithLine(e1);
				}
				else if (e0.shape == ShapeLine && e1.shape == ShapeCircle) {
					e1.collidedWithLine(e0);
				}
				else if (e0.shape == ShapeCircle && e1.shape == ShapeRectangle) {
					e0.collidedWithRect(e1);
				}
				else if (e0.shape == ShapeRectangle && e1.shape == ShapeCircle) {
					e1.collidedWithRect(e0);
				}
			}
		}
	}
}