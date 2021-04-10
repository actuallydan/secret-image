import styles from '../styles/Home.module.css'
import { useEffect, useState } from "react";
import Head from "next/head";

export default function Home() {
  const [image, setImage] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [text, setText] = useState("")
  const [isHovering, setIsHovering] = useState(false);
  const [bufferImage, setBufferImage] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files[0];
    updateImage(file)
  };

  async function updateImage(file) {
    console.log(file)
    setImage(file)
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    let blob = await fetch(url)
      .then((r) => r.blob())

    var buffer = await blob.arrayBuffer();
    setBufferImage(buffer)
  }

  function updateText(e) {
    setText(e.target.value)
  }

  function clearMem() {
    URL.revokeObjectURL(imageUrl)
  }

  const handleDragEnter = e => {
    e.preventDefault();
    // e.stopPropagation();
    console.log("change enter!")
    setIsHovering(true)
  };
  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    console.log("change leave!")
    setIsHovering(false)
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(true)
  };



  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file.type === "image/png") {
      updateImage(file)
    }
    setIsHovering(false)
  };

  function decode() {
    Jimp.read(bufferImage)
      .then(image => {
        let secret = [];

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
          // var alpha = this.bitmap.data[idx + 3];

          secret.push(255 - this.bitmap.data[idx + 3]);
        });

        const targetArr = new Array(secret.length / 3 | 0);

        for (let i = 0; i < secret.length; i += 3) {
          targetArr[i / 3] = secret[i] * 100 + secret[i + 1] * 10 + secret[i + 2]
        }

        secret = targetArr.map(t => String.fromCharCode(t)).join("")

        setText(secret)
      })
      .catch(err => {
        console.error(err);
      });
  }

  function stringArrterator(arr) {
    const str = arr;

    return {
      nextChar: () => {
        return str.splice(0, 1)[0] || null
      }
    }

  }
  function encode() {

    // do encoding
    Jimp.read(bufferImage)
      .then(image => {
        // convert text => char[] => int[] => char[] (number strings) => string[] (001, 032, 123) => char[][] => char[] (3x length of original arr)
        let t0 = performance.now();
        let charArr = [...text].map(c => c.charCodeAt().toString().padStart(3, "0").split("")).flat();
        // const { nextChar } = stringArrterator(charArr);
        let c = 0
        for (let y = 0; y < image.bitmap.height; y++) {
          for (let x = 0; x < image.bitmap.width; x++) {
            c = charArr[x + y * image.bitmap.width];

            if (!c) {
              break;
            }

            // create object with charCode alpha { r: 49, g: 58, b: 53, a: char.charCodeAt() }
            const { r, g, b } = Jimp.intToRGBA(image.getPixelColor(x, y))
            // convert rgba to hex with Jimp.rgbaToInt(r, g, b, a);
            const newHex = Jimp.rgbaToInt(r, g, b, 255 - c)
            // let t2 = performance.now();

            // console.log("second part", t2 - t1);
            // set pixel color as hex => image.setPixelColor(hex, x, y); 
            image.setPixelColor(newHex, x, y);
            // console.log("third part", performance.now() - t2);

          }
        }
        let t1 = performance.now();
        console.log("first part", t1 - t0);

        return image.getBase64Async('image/png');
      }).then(base64Image => {
        // const blob = b64toBlob(base64Image);
        // updateImage(newImage)
        return blobToFile(base64Image);
      }).then(file => {
        updateImage(file);
        setText("")
        download(file)
      })
      .catch(err => {
        console.error(err);
      });
  }

  function blobToFile(url) {
    return (fetch(url)
      .then(function (res) { return res.arrayBuffer(); })
      .then(function (buf) { return new File([buf], image.name.replace(".png", "-modified.png"), { type: image.type }); })
    );
  }

  function download(file) {
    var element = document.createElement('a');
    element.setAttribute('href', URL.createObjectURL(file));
    element.setAttribute('download', file.name);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const disableEncode = !bufferImage || !text;
  const disableDecode = !image || !imageUrl || !bufferImage;

  return (
    <div className={styles.container}>
      <Head>
        <script src="https://unpkg.com/jimp@0.14.0/browser/lib/jimp.js"></script>
      </Head>
      <div className={styles.picAndTextWrapper}>
        <div className={styles.halfScreen}>
          <fieldset className={styles.fieldset}>
            <legend>Text</legend>
            <textarea value={text} className={styles.textarea} onChange={updateText} placeholder="Enter secret text to encode here!" ></textarea>

          </fieldset>
          <button disabled={disableEncode} className={`${styles.button} ${disableEncode ? styles.disableBtn : ""}`} onClick={encode}>
            Encode Text
          </button>
        </div>
        <div className={styles.halfScreen}>
          <fieldset className={styles.fieldset}>
            <legend>Image</legend>
            <div onDrop={e => handleDrop(e)}
              className={`${styles.dropTarget} ${isHovering ? styles.onHover : ""}`}
              onDragOver={e => handleDragOver(e)}
              onDragEnter={e => handleDragEnter(e)}
              onDragLeave={e => handleDragLeave(e)}
            >
              {image
                ? <img src={imageUrl} onLoad={clearMem} className={styles.previewImage} />
                : <div>
                  <label htmlFor="file-target" className={styles.button}>Click or Drop a File</label>
                  <input id="file-target"
                    className={styles.hide}
                    crossOrigin="true"
                    type="file"
                    accept="png"
                    onChange={handleImageChange} />
                </div>
              }
            </div>

          </fieldset>
          <button disabled={disableDecode} className={`${styles.button} ${disableDecode ? styles.disableBtn : ""}`} onClick={decode}>
            Decode From Image
          </button>
        </div>
      </div>

    </div>
  )
}