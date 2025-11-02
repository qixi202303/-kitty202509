import { createTestEnv, kitty, req } from "utils"

export default class kimivod implements Handle {
  getConfig() {
    return <Iconfig>{
      id: "kimivod$",
      name: "KiMivod",
      type: 1,
      nsfw: false,
      api: "https://cn.kimivod.com",
      extra: {
        gfw: false,
      }
    }
  }

  async getCategory() {
    return [
      { text: "電視", id: "/vod/show/id/1.html" },
      { text: "電影", id: "/vod/show/id/2.html" },
      { text: "動漫", id: "/vod/show/id/3.html" },
      { text: "綜藝", id: "/vod/show/id/4.html" },
      { text: "短劇", id: "/vod/show/id/39.html" },
      { text: "倫理", id: "/vod/show/id/42.html" },
    ]
  }

  async getHome() {

    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    }
    const cate = env.get<string>('category') || '/vod/show/id/1.html'
    const page = env.get<number>('page') || 1
    const url = page === 1
      ? `${env.baseUrl}${cate}`
      : `${env.baseUrl}${cate.replace('.html', '')}/page/${page}.html`

    const html = await req(url, { headers })
    const $ = kitty.load(html)

    const items = $('.grid.container_list .post, .s6.m3.l2').toArray()
    return items.map(item => {
      const a = $(item).find('a').first()
      const id = a.attr('href') ?? ""
      const title = a.attr('title')?.trim() || $(item).find('img').attr('alt')?.trim() || ""
      const cover = $(item).find('img').attr('data-src')?.trim() ?? ""
      const remark = $(item).find('.absolute').text().trim()
      return { id, title, cover, remark, desc: '' }
    })
  }

  async getDetail() {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    }
    const id = env.get<string>('movieId')
    let url = id
    if (!id.startsWith('http')) {
      url = `${env.baseUrl}${id}`
    }
    const html = await req(url, { headers })
    const $ = kitty.load(html)
    const titles = $(".tabs a").toArray().map(item=> {
      return $(item).find(".max").text().trim()
    })
    const videos = $(".page").toArray().map(item=> {
      return $(item).find(".playno a").toArray().map(item=> {
        const id = $(item).attr("href") ?? ""
        const title = $(item).text().trim()
        return <IPlaylistVideo>{ text: title, id }
      })
    })
    const list = titles.map((title, index)=> {
      return <IPlaylist>{
        title,
        videos: videos[index]
      }
    })
    return <IMovie>{ playlist: list }
  }

  async getSearch() {
    const wd = env.get<string>('keyword')
    const page = env.get<number>('page')
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    }
    const url = `${env.baseUrl}/search.php?page=${page}&searchword=${wd}&searchtype=`

    const html = await req(url, { headers })
    const $ = kitty.load(html)

    const items = $('.myui-vodlist__media .active').toArray().map(cx => {
      const a = $(cx).find('a')
      const id = $(a).attr('href') ?? ""
      const title = $(a).attr('title')?.trim() ?? ""
      const cover = $(a).attr("data-original") ?? ""
      const remark = $(cx).find(".pic-tag.pic-tag-top").text().trim()
      return { id, title, cover, remark }
    })
    return items
  }

  async parseIframe() {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    }
    const iframe = env.get<string>('iframe')
    const html = await req(iframe.startsWith('http') ? iframe : `${env.baseUrl}${iframe}`, { headers })
    const $ = kitty.load(html)
    return $('meta[itemprop="contentUrl"]').attr('content')?.trim() ?? ""
  }
}

const env = createTestEnv("https://cn.kimivod.com")
const call = new kimivod();
(async () => {
  const cates = await call.getCategory()
  env.set("category", cates[0].id)
  env.set("page", "1")
  const home = await call.getHome()
  env.set("keyword", "我能")
  const search = await call.getSearch()
  env.set("movieId", search[1].id)
  const detail = await call.getDetail()
  env.set("iframe", detail.playlist![0].videos[0].id)
  const iframe = await call.parseIframe()
  debugger
})()