export default class BJCamSource implements Handle {
  getConfig() {
    return <Iconfig>{
      id: 'bjcam',
      name: 'PanDaTV_WEB',
      api: 'https://sexbjcam.com',
      nsfw: true,
      type: 1,
    };
  }

  async getCategory() {
    return <ICategory[]>[
      { id: 'korean-bj', text: 'KOREAN BJ' },
      { id: 'chinese-gril', text: 'CHINESE GIRL' },
    ];
  }

  async getHome() {
    const cate = env.get<string>('category') ?? 'chinese-gril';
    const page = env.get<number>('page') ?? 1;
    const url =
      page === 1
        ? `${env.baseUrl}/category/${cate}/`
        : `${env.baseUrl}/category/${cate}/page/${page}/`;

    const html = await req(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Referer': env.baseUrl,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    const $ = kitty.load(html);

    return $('.videos-list article')
      .toArray()
      .map(item => {
        const el = $(item);
        const a = el.find('a').first();
        const id = a.attr('href') ?? '';
        const title =
          a.attr('title')?.trim() ||
          el.find('.entry-header span').first().text().trim() ||
          '';

        let img =
          el.find('img.video-main-thumb').attr('src') ??
          el.attr('data-main-thumb') ??
          '';
        if (img && img.endsWith('.gif')) {
          const fallback = el.attr('data-main-thumb');
          if (fallback) img = fallback;
        }
        const cover = img && img.startsWith('/') ? `${env.baseUrl}${img}` : img;
        const remark = el.find('.duration').first().text().trim();

        return { id, title, cover, remark, desc: '', playlist: [] };
      });
  }

  async getDetail() {
    const id = env.get<string>('movieId');
    const url = id.startsWith('http') ? id : `${env.baseUrl}${id}`;
    const html = await req(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Referer': env.baseUrl,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    const $ = kitty.load(html);

    const title =
      $('meta[itemprop="name"]').attr('content')?.trim() ||
      $('title').text().trim();

    const cover =
      $('meta[itemprop="thumbnailUrl"]').attr('content') ||
      $('meta[property="og:image"]').attr('content') ||
      '';

    // 提取 iframe 外链，优先 data-link
    const iframe =
      $('iframe').attr('data-link') ??
      $('iframe').attr('src') ??
      $('iframe').attr('SRC') ??
      $('iframe').attr('data-src') ??
      '';

    return <IMovie>{
      title,
      cover,
      playlist: [
        {
          title: '在线播放',
          videos: [
            { text: '立即播放', id: iframe },          // 给 parseIframe 用
            { text: '网页播放', id: url, type: 'web' }, // 直接用详情页地址
          ],
        },
      ],
    };
  }

  async getSearch() {
    const keyword = env.get<string>('keyword');
    const page = env.get<number>('page') ?? 1;
    const url =
      page === 1
        ? `${env.baseUrl}/?s=${encodeURIComponent(keyword)}`
        : `${env.baseUrl}/page/${page}/?s=${encodeURIComponent(keyword)}`;

    const html = await req(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Referer': env.baseUrl,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    const $ = kitty.load(html);

    return $('.videos-list article')
      .toArray()
      .map(item => {
        const el = $(item);
        const a = el.find('a').first();
        const id = a.attr('href') ?? '';
        const title =
          a.attr('title')?.trim() ||
          el.find('.entry-header span').first().text().trim() ||
          '';

        let img =
          el.find('img.video-main-thumb').attr('src') ??
          el.attr('data-main-thumb') ??
          '';
        if (img && img.endsWith('.gif')) {
          const fallback = el.attr('data-main-thumb');
          if (fallback) img = fallback;
        }
        const cover = img && img.startsWith('/') ? `${env.baseUrl}${img}` : img;
        const remark = el.find('.duration').first().text().trim();

        return { id, title, cover, remark, desc: '', playlist: [] };
      });
  }

  async parseIframe() {
    const iframe = env.get<string>('iframe') ?? env.get<string>('play') ?? '';
    if (!iframe) return '';

    const html = await req(iframe, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Referer': env.baseUrl,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    const match =
      html.match(/"url"\s*:\s*"([^"]+\.m3u8)"/) ||
      html.match(/['"]([^'"]+\.m3u8)['"]/);

    return match ? match[1] : iframe;
  }
}
