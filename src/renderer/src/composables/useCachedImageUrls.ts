import { ref, watch, type Ref } from 'vue';

import { resolveImageUrl } from '../utils/image-url';

import { useNetworkStatusStore } from '../stores/networkStatus';



/** Bir neçə şəkil — əvvəl keş, sonra (onlayn) uzaq URL. */

export function useCachedImageUrls(

  getRaws: () => (string | null | undefined)[],

): Ref<string[]> {

  const displayUrls = ref<string[]>([]);

  let loadGen = 0;

  const network = useNetworkStatusStore();



  watch(

    () => ({ raws: getRaws(), online: network.isOnline }),

    async ({ raws, online }) => {

      const gen = ++loadGen;

      const out: string[] = [];



      for (const raw of raws) {

        const remote = resolveImageUrl(raw ?? undefined);

        if (!remote) continue;



        let url = '';

        const elfim = window.elfim;



        if (elfim?.resolveCachedImage) {

          try {

            const local = await elfim.resolveCachedImage(remote);

            if (gen !== loadGen) return;

            if (local) url = local;

          } catch {

            /* ignore */

          }

        }



        if (!url && online) url = remote;

        if (url) out.push(url);



        if (online && url === remote && elfim?.resolveOrCacheImage) {

          const index = out.length - 1;

          void elfim.resolveOrCacheImage(remote, true).then((cached) => {

            if (gen !== loadGen || !cached) return;

            const next = [...displayUrls.value];

            if (index < next.length) {

              next[index] = cached;

              displayUrls.value = next;

            }

          });

        }

      }



      if (gen !== loadGen) return;

      displayUrls.value = out;

    },

    { immediate: true, deep: true },

  );



  return displayUrls;

}

