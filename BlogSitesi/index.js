const multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/dosyalar/resimler')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.jpg')
  }
});
var upload = multer({ storage: storage });

const mysql = require("mysql");
const bodyParser = require("body-parser");
const express = require("express");
const app     = express();

var session = require('express-session')
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'dostum',

}))


app.use(bodyParser.urlencoded( {extended: true} ));
app.set("view engine" , "ejs");
app.use(express.static(__dirname + "/dosyalar"));
app.use(bodyParser.json());


var connection = mysql.createConnection({
  multipleStatements : true,
  host     : 'localhost',
  user     : 'root',
  password : '12344321',
  database : 'blogsitesi'
});
connection.connect(function(err){
  if(err) throw err;
  console.log("MYSQL'e bağlandı..");
});

var kategoriler = [];
var cokOkunanlar = [];


function getKategoriler(callback){
  if (kategoriler.length > 0){
    callback(kategoriler);
  }else {
    connection.query("SELECT * from kategoriler", function(err, results, fields){
      kategoriler = results;
      callback(results);
    });
  }
}

function getCokOkunanlar(callback){
if (cokOkunanlar.length>0){
  callback(cokOkunanlar);
}else {
  connection.query("SELECT * from makaleler ORDER BY okunmasayisi DESC", function(err, results, fields){
    cokOkunanlar = results;
    callback(results);
  });
}
}


app.get("/", function(req, res){
  getCokOkunanlar(function(gelenCokOkunanlar){
    getKategoriler(function(gelenkategoriler){

      connection.query("SELECT * FROM makaleler", function(err, results, fields){
        res.render("home", {
                            kategoriler : gelenkategoriler,
                            cokOkunanlar: gelenCokOkunanlar,
                            makaleler : results
                            });
      })
  });

  });

});

app.get("/kategori/:link", function(req,res){
  var hangiLink = req.params.link;
getKategoriler(function(gelenkategoriler){
  getCokOkunanlar(function(gelenCokOkunanlar){
    var sql = "SELECT blogsitesi.makaleler.* FROM blogsitesi.makaleler LEFT JOIN blogsitesi.kategoriler ON blogsitesi.kategoriler.link = '"+hangiLink+"' WHERE blogsitesi.kategoriler.isim = blogsitesi.makaleler.kategori";
    connection.query(sql, function(err, results, fields){
        res.render("home", {
          kategoriler : gelenkategoriler,
          cokOkunanlar : gelenCokOkunanlar,
          makaleler : results,
        })
    });
  });
});

});

app.get("/yazi/:id", function(req,res){
  var yaziId = req.params.id;

  getKategoriler(function(gelenkategoriler){
  getCokOkunanlar(function(gelenCokOkunanlar){

    var artirmaSorgusu = "UPDATE blogsitesi.makaleler SET blogsitesi.makaleler.okunmasayisi = blogsitesi.makaleler.okunmasayisi +1 WHERE blogsitesi.makaleler.id = "+ yaziId;
    connection.query(artirmaSorgusu);

    var sql = "SELECT * FROM blogsitesi.makaleler WHERE id= " + yaziId;
    connection.query(sql, function(err, results, fields){
        res.render("yazi", {
          kategoriler : gelenkategoriler,
          cokOkunanlar : gelenCokOkunanlar,
          baslik : results[0].baslik,
          tarih : results[0].tarih,
          okunmasayisi : results[0].okunmasayisi,
          resim : results[0].resim,
          aciklama : results[0].aciklama
        });
    });
  });
});

});

app.get("/makaleekle", function(req,res){
  res.sendFile(__dirname+ "/views/makaleekle.html")
});

app.post("/veritabanina-ekle", upload.single("dosya"), function(req,res){
var resimlinki ="";
  if (req.file){
    resimlinki = "/resimler/"+req.file.filename;
  }

  var kategori = req.body.kategori;
  var baslik = req.body.baslik;
  var yazi = req.body.makale;

date = new Date()
var tarih = date.getFullYear() + "-"+(date.getMonth()+1) + "-" + date.getDate();

var degerler = "'"+baslik+"','"+yazi+"','"+resimlinki+"','"+kategori+"','"+tarih+"', 0";
var sql = "INSERT INTO makaleler (baslik, aciklama, resim, kategori, tarih, okunmasayisi) VALUES("+degerler+")";
 connection.query(sql, function(err, results, fields){
   res.redirect("/admin-makaleekle")
 })
});

app.get("/admin-panel", function(req, res){
    if(req.session.kullanici){
      res.redirect("/admin-makaleler");
    }else {
      res.sendFile(__dirname + "/views/giris.html");
    }

  res. sendFile(__dirname+ "/views/giris.html");
})

app.get("/admin-makaleekle", function(req,res){
  res.render("admin-makaleekle");
});

app.get("/admin-makaleler", function(req,res){
    res.render("admin-makaleler");
});


app.post("/giris-kontrol", function(req, res){
  var email = req.body.email;
  var pass= req.body.password;

connection.query("SELECT * FROM profil", function(err, results, fields){
  var veritabanindakiKillaniciAdi = results[0].kullaniciadi;
  var veritabanindakiSifre = results[0].sifre;

  if(veritabanindakiKillaniciAdi == email && veritabanindakiSifre == pass ){
    req.session.kullanici = veritabanindakiKillaniciAdi;

    res.redirect("/admin-makaleler");
  }else {
    res.redirect("/admin-panel");
  }
});

});

app.get("/cikis", function(req, res){
  delete req.session.kullanici;
  res.redirect("/");
})


app.listen(5000);